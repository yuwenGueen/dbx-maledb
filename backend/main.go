package main

/*
#cgo CXXFLAGS: -std=c++17 -O2 -I${SRCDIR}/../vendor/gb-mahjong-js/third_party/GB-Mahjong/mahjong -I${SRCDIR}/../vendor/gb-mahjong-js/third_party/GB-Mahjong/console
#cgo darwin LDFLAGS: -lc++
#cgo linux LDFLAGS: -lstdc++
#include <stdlib.h>
char* maledb_score(const char* notation);
*/
import "C"

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"time"
	"unsafe"

	sdk "github.com/t8y2/dbx/plugins/sdk/go/dbx-plugin-sdk"
)

type Fan struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Value int    `json:"value"`
	Count int    `json:"count"`
}
type Score struct {
	Total int    `json:"total"`
	Fans  []Fan  `json:"fans"`
	Error string `json:"error,omitempty"`
}

var validNotation = regexp.MustCompile(`^[1-9mspESWNCFPa-h0-9,\[\]| ]+$`)

func score(notation string) (Score, error) {
	if len(notation) == 0 || len(notation) > 320 || !validNotation.MatchString(notation) {
		return Score{}, errors.New("手牌格式无效")
	}
	input := C.CString(notation)
	defer C.free(unsafe.Pointer(input))
	output := C.maledb_score(input)
	if output == nil {
		return Score{}, errors.New("算番内存不足")
	}
	defer C.free(unsafe.Pointer(output))
	var result Score
	if err := json.Unmarshal([]byte(C.GoString(output)), &result); err != nil {
		return Score{}, errors.New("算番结果无效")
	}
	if result.Error != "" {
		return Score{}, errors.New(result.Error)
	}
	if result.Total <= 0 || len(result.Fans) == 0 {
		return Score{}, errors.New("算番结果为空")
	}
	return result, nil
}

type service struct{}

func (service) Handle(_ sdk.RequestContext, method string, raw json.RawMessage, _ *sdk.Emitter) (any, *sdk.PluginError) {
	if method != "mahjong/score" {
		return nil, sdk.MethodNotFound(method)
	}
	var params struct {
		Hand string `json:"hand"`
	}
	if len(raw) > 1024 || json.Unmarshal(raw, &params) != nil {
		return nil, sdk.NewError(-32602, "手牌参数无效")
	}
	result, err := score(params.Hand)
	if err != nil {
		return nil, sdk.NewError(-32602, err.Error())
	}
	return result, nil
}

func preview(address, ui string) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil || host != "127.0.0.1" {
		return errors.New("预览服务只监听 127.0.0.1")
	}
	listener, err := net.Listen("tcp4", address)
	if err != nil {
		return err
	}
	root, err := filepath.Abs(ui)
	if err != nil {
		return err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/score", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if r.Method != http.MethodPost {
			http.Error(w, "POST required", 405)
			return
		}
		if r.Header.Get("Origin") != "" && r.Header.Get("Origin") != "http://"+listener.Addr().String() {
			http.Error(w, "Origin rejected", 403)
			return
		}
		var p struct {
			Hand string `json:"hand"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&p) != nil {
			http.Error(w, "Invalid request", 400)
			return
		}
		result, err := score(p.Hand)
		if err != nil {
			w.WriteHeader(422)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		json.NewEncoder(w).Encode(result)
	})
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(filepath.Join(filepath.Dir(root), "assets")))))
	mux.Handle("/", http.FileServer(http.Dir(root)))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != listener.Addr().String() {
			http.Error(w, "Host rejected", 403)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		mux.ServeHTTP(w, r)
	})
	fmt.Fprintf(os.Stderr, "麻了DB preview: http://%s\n", listener.Addr().String())
	return (&http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second}).Serve(listener)
}

func main() {
	address := flag.String("preview", "", "Local browser preview address")
	ui := flag.String("ui", "ui", "Built UI directory")
	input := flag.String("score", "", "Score one hand and exit")
	flag.Parse()
	if *input != "" {
		result, err := score(*input)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		json.NewEncoder(os.Stdout).Encode(result)
		return
	}
	if *address != "" {
		log.Fatal(preview(*address, *ui))
		return
	}
	if err := sdk.NewServer(sdk.Metadata{ID: "dev.maledb.mahjong", Version: "0.1.0", Capabilities: []string{"mahjong"}}, service{}).Serve(); err != nil {
		log.Fatal(err)
	}
}
