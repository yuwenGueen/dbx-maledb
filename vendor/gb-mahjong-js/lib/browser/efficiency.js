"use strict";

const { analyzeHandDetailed } = require("../solver/efficiency/detailed");

const analyzeEfficiency = (input, options = {}) =>
  analyzeHandDetailed(input, {
    compact: true,
    ...options
  });

module.exports = {
  analyzeHandDetailed,
  analyzeEfficiency
};
