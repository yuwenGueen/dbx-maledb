#include <cstdlib>
#include <cstring>
#include <sstream>
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/mahjong/tile.cpp"
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/mahjong/pack.cpp"
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/mahjong/handtiles.cpp"
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/mahjong/fan.cpp"
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/console/print.cpp"
#include "../vendor/gb-mahjong-js/third_party/GB-Mahjong/console/console.cpp"

static char* copy_result(const std::string &value) {
    char* result = static_cast<char*>(std::malloc(value.size() + 1));
    if (result) std::memcpy(result, value.c_str(), value.size() + 1);
    return result;
}

extern "C" char* maledb_score(const char* notation) {
    try {
        mahjong::Handtiles hand;
        if (hand.StringToHandtiles(notation) != 0) return copy_result("{\"error\":\"手牌或和牌条件无效\"}");
        mahjong::Fan fan;
        if (!fan.JudgeHu(hand)) return copy_result("{\"error\":\"这副牌尚未和牌\"}");
        fan.CountFan(hand);
        std::ostringstream out;
        out << "{\"total\":" << fan.tot_fan_res << ",\"fans\":[";
        bool first = true;
        for (int id = 1; id < mahjong::FAN_SIZE; ++id) {
            const auto count = fan.fan_table_res[id].size();
            if (!count) continue;
            if (!first) out << ',';
            first = false;
            out << "{\"id\":" << id << ",\"name\":\"" << mahjong::FAN_NAME[id]
                << "\",\"value\":" << mahjong::FAN_SCORE[id] << ",\"count\":" << count << '}';
        }
        out << "]}";
        return copy_result(out.str());
    } catch (...) {
        return copy_result("{\"error\":\"算番失败，请重试\"}");
    }
}
