var request = require('request');
var cheerio = require('cheerio');
var rp = require('request-promise');
var _ = require('underscore')

module.exports = function (Q) {
  return {
    parseLbaMoto: function () {
      var self = this;
      var lbaRootLink = 'http://www.lbamoto.ru';
      return this.cheerioRequest(lbaRootLink).then(function ($) {
        var categoriesList = $('a', $('ul.level1')).map(function (i, el) {
          return $(this).attr('href');
        }).get();
        categoriesList = _.unique(categoriesList);
        console.log(categoriesList.join("\n"));
        //categoriesList = _.take(categoriesList, 10); //TODO
        return Q.all(categoriesList.map(function (categoryLink) {
          var categoryUrl = lbaRootLink + categoryLink + '/results,0-1000';
          return self.cheerioRequest(categoryUrl).then(function ($) {
            console.log('Scraping: ' + categoryUrl);
            return _.filter($('.row > .product').map(function () {
              var link = $('a', $(this));
              if (!link.text()) {
                return;
              }
              var priceBlock = $('.product-price__base', $(this));
              if (!priceBlock || !priceBlock.text()) {
                return;
              }
              var priceMatch = priceBlock.text().match(/(\d+)\s+руб/);
              if (!priceMatch) {
                return;
              }
              return {
                name: link.text().trim(),
                siteUrl: lbaRootLink + link.attr('href'),
                price: parseInt(priceMatch[1]) * 100
              };
            }).get(), _.identity);
          })
        })).then(_.flatten);
      })
    },
    cheerioRequest: function (url, retries) {
      var self = this;
      return Q(rp({
        url: url,
        transform: function (body) { return cheerio.load(body) }
      })).catch(function (e) {
        console.error(e);
        if (retries === 0) {
          throw e;
        }
        return self.cheerioRequest(url, (retries || 3) - 1);
      });
    }
  }
}
