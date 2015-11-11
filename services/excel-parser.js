var request = require('request');
var XLSX = require('xlsx');
var _ = require('underscore')
var querystring = require("querystring");


module.exports = function (Q) {
  var qRequest = Q.nfbind(request);
  return {
    parsePartAvailabilities: function (provider, url, parseMethod) {
      var self = this;
      if (url.indexOf('https://yadi.sk') !== -1) {
        return qRequest({
          method: 'GET',
          url: 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=' + url,
          json: true
        }).then(function (resourceUrl) {
          console.log(resourceUrl[1]);
          var item = _.find(resourceUrl[1]._embedded.items, function (item) {
            return item.name.indexOf('xls') !== -1;
          })
          console.log(item);
          var getDownloadUrl = 'https://cloud-api.yandex.net/v1/disk/public/resources/download?' + querystring.stringify({public_key: item.public_key, path: item.path});
          console.log(getDownloadUrl);
          return qRequest({
            method: 'GET',
            url: getDownloadUrl,
            json: true
          }).then(function (downloadUrl) {
            console.log(downloadUrl[1]);
            return qRequest({
              method: 'GET',
              url: downloadUrl[1].href,
              encoding: null
            }).then(function (res) {
              return self[parseMethod](provider, res[1]);
            })
          })
        })
      }
      if (url.indexOf('mr-moto.ru') !== -1) {
        return self.extractMrMoto(provider, url, parseMethod);
      }
      return Q.nfcall(request, {
        method: 'GET',
        url: url,
        encoding: null
      }).then(function (res) {
        console.log(res[0]);
        return self[parseMethod](provider, res[1]);
      })
    },
    extractMrMoto: function (provider, url, parseMethod) {
      var self = this;
      return qRequest({method: 'GET', url: url}).then(function (res) {
        var fileUrl = res[1].match(/\<a\s+href\=\'(.*?)\'(.*?)\>остатки(.*?)\<\/a\>/)[1];
        console.log(fileUrl);
        return qRequest({method: 'GET', url: 'http://www.mr-moto.ru' + fileUrl, encoding: null}).then(function (res) {
          console.log(res[0]);
          return self[parseMethod](provider, res[1]);
        })
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
        if (!cellValue(23, i) || !cellValue(0, i)) {
          continue;
        }
        result.push({
          sku: cellValue(0, i),
          name: cellValue(3, i),
          price: cellValue(23, i)*100,
          provider: {id: provider.id, name: provider.name},
          isAvailable: !!cellValue(21, i)
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
          provider: provider,
          isAvailable: !!cellValue(8, i)
        })
      }
      return result;
    },
    parseDriveBike: function (provider, xlsxBinary) {
      var workbook = XLSX.read(xlsxBinary);
      var first_sheet_name = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[first_sheet_name];

      function cellValue(c, r) {
        var cell = worksheet[XLSX.utils.encode_cell({c: c, r: r})];
        //console.log(cell);
        return cell && cell.v;
      }

      var result = [];
      for (var i = 1; cellValue(0, i); i++) {
        if (!cellValue(5, i)) {
          continue;
        }
        result.push({
          name: cellValue(5, i).replace("[", "").replace("]", ""),
          price: cellValue(7, i)*100,
          provider: provider,
          isAvailable: true
        })
      }
      return result;
    }
  }
}
