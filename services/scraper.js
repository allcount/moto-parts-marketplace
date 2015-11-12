var request = require('request');
var cheerio = require('cheerio');
var rp = require('request-promise');
var _ = require('underscore')

module.exports = function (Q) {
  var pool = {maxSockets: 2};
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
    parseMrMoto: function () {
      var self = this;
      var entryLink = 'http://www.mr-moto.ru/Netshop/shop/charges/';
      var rootLink = 'http://www.mr-moto.ru';

      function drillDown(categoriesList, selector) {
        return Q.all(categoriesList.map(function (categoryUrl) {
          return self.cheerioRequest(categoryUrl).then(function ($) {
            var collectHrefs = self.collectHrefs($);
            return collectHrefs($(selector), rootLink);
          })
        })).then(_.flatten);
      }

      return this.cheerioRequest(entryLink).then(function ($) {
        var collectHrefs = self.collectHrefs($);
        var categoriesList = collectHrefs($('.divmenu1 a'), rootLink);
        console.log(categoriesList.join("\n"));
        return drillDown(categoriesList, '.divmenu2 a').then(function (secondList) {
          return drillDown(secondList, '.divmenu3 a').then(function (thirdList) {
            return _.unique(_.union(categoriesList, secondList, thirdList));
          })
        }).then(function (allCategories) {
          console.log(allCategories.join("\n"));
          //allCategories = _.take(allCategories, 10); //TODO
          return Q.all(allCategories.map(function (categoryLink) {
            var categoryUrl = categoryLink + '?portion=-1';
            return self.cheerioRequest(categoryUrl).then(function ($) {
              console.log('Scraping: ' + categoryUrl);
              return _.filter($('.tovblock').map(function () {
                var link = $($('a', $(this))[1]);
                var priceBlock = $($('div', link)[1]);
                if (!priceBlock || !priceBlock.text()) {
                  return;
                }
                var priceMatch = priceBlock.text().trim();
                if (!priceMatch) {
                  return;
                }
                return {
                  name: $($('div', link)[0]).text().trim(),
                  siteUrl: rootLink + link.attr('href'),
                  price: parseInt(priceMatch) * 100
                };
              }).get(), _.identity);
            })
          })).then(_.flatten);
        })
      });
    },
    parseDriveBike: function () {
      var self = this;
      var entryLink = 'http://www.drivebike.ru/zapchasti';

      return this.cheerioRequest(entryLink).then(function ($) {
        var collectHrefs = self.collectHrefs($);
        var categoriesList = collectHrefs($('.amshopby-cat-level-1 a'));
        console.log(categoriesList.join("\n"));
        return categoriesList;
      }).then(function (allCategories) {
        console.log(allCategories.join("\n"));
        allCategories = _.unique(allCategories);
        //allCategories = _.take(allCategories, 0); //TODO
        return Q.all(allCategories.map(function (categoryLink) {
          var categoryUrl = categoryLink + '?limit=60&mode=grid';

          function scrapePage(pageUrl) {
            return self.cheerioRequest(pageUrl).then(function ($) {
              console.log('Scraping: ' + pageUrl);
              var itemsOnPage = _.filter($('li.item').map(function () {
                var link = $('.product-name a', $(this));
                var priceBlock = $('.price-box .regular-price, .price-box .special-price', $(this));
                if (!priceBlock || !priceBlock.text()) {
                  return;
                }
                var priceMatch = priceBlock.text().trim().replace(/\s/g, '').match(/(\d+)/);
                if (!priceMatch) {
                  return;
                }
                var manufacturer = $('.manufacturer-name', $(this));
                return {
                  name: ((manufacturer && manufacturer.text().trim() + ' ') || '') + link.text().trim(),
                  siteUrl: link.attr('href'),
                  price: parseInt(priceMatch[1]) * 100
                };
              }).get(), _.identity);
              var nextPage = $('a.i-next');
              if (!nextPage || !nextPage.attr('href')) {
                return itemsOnPage;
              }
              return scrapePage(nextPage.attr('href')).then(function (nextPageItems) {
                return _.union(itemsOnPage, nextPageItems);
              })
            })
          }

          return scrapePage(categoryUrl);

        })).then(_.flatten).then(function (items) {
          return _.unique(items, _.property('name'));
        });
      });
    },
    collectHrefs: function ($) {
      return function ($el, root) {
        return _.unique(_.filter($el.map(function (i, el) {
          if (root && $(this).attr('href').indexOf('/') !== 0) {
            return;
          }
          return (root || '') + $(this).attr('href');
        }).get(), _.identity));
      }
    },
    cheerioRequest: function (url, retries) {
      var self = this;
      return Q(rp({
        url: url,
        transform: function (body) { return cheerio.load(body) },
        pool: pool
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
