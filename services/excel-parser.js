var request = require('request');
var XLSX = require('xlsx');

module.exports = function (Q) {
  return {
    parsePartAvailabilities: function (provider, url, parseMethod) {
      var self = this;
      return Q.nfcall(request, {
        method: 'GET',
        url: url,
        encoding: null
      }).then(function (res) {
        return self[parseMethod](provider, res[1]);
      })
    },
    parseLbaMoto: function (provider, xlsxBinary) {
      var workbook = XLSX.read(xlsxBinary);
      var first_sheet_name = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[first_sheet_name];

      function cellValue(c, r) {
        var cell = worksheet[XLSX.utils.encode_cell({c: c, r: r})];
        //console.log(cell);
        return cell && cell.v;
      }

      var result = [];
      for (var i = 10; cellValue(3, i); i++) {
        if (!cellValue(23, i)) {
          continue;
        }
        result.push({
          name: cellValue(3, i),
          price: cellValue(23, i)*100,
          provider: provider
        })
      }
      return result;
    },
    parseMrMoto: function (provider, xlsxBinary) {
      var workbook = XLSX.read(xlsxBinary);
      var first_sheet_name = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[first_sheet_name];

      function cellValue(c, r) {
        var cell = worksheet[XLSX.utils.encode_cell({c: c, r: r})];
        //console.log(cell);
        return cell && cell.v;
      }

      var result = [];
      for (var i = 10; cellValue(0, i); i++) {
        if (!cellValue(5, i)) {
          continue;
        }
        result.push({
          name: cellValue(0, i),
          price: cellValue(5, i)*100,
          provider: provider
        })
      }
      return result;
    }
  }
}
