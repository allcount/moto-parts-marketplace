A.app({
  appName: "zrum.ru - Мотозапчасти",
  appIcon: "heart",
  theme: 'cosmic',
  forceLocale: 'ru',
  googleAnalyticsId: 'UA-69614904-1',
  menuItems: [
    {
      name: "Запчасти",
      icon: "box",
      entityTypeId: "Part",
    },
    {
      name: "Поставщики",
      icon: "box",
      entityTypeId: "Provider",
    },
    {
      name: "Наличие",
      icon: "box",
      entityTypeId: "PartAvailability",
    }
  ],
  entities: function(Fields) {
    return {
      Part: {
        fields: {
          name: Fields.text("Наименование").required()
        },
        permissions: {
          read: ['admin']
        },
        referenceName: "name"
      },
      Provider: {
        fields: {
          name: Fields.text("Название").required(),
          priceUrl: Fields.text("Ссылка на прайс-лист").required(),
          siteUrl: Fields.text("Адрес сайта"),
          phone: Fields.text("Телефон"),
          parseMethod: Fields.text("Метод разбора XLS").required()
        },
        referenceName: "name",
        permissions: {
          read: ['admin']
        },
        actions: [{
          id: 'reload',
          name: 'Загрузить',
          actionTarget: 'single-item',
          perform: function (Crud, Actions, ExcelParser, Console, Q, Pipes) {
            var crud = Crud.actionContextCrud();
            return crud.readEntity(Actions.selectedEntityId()).then(function (provider) {
              return loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q, Pipes);
            }).then(function () {
              return Actions.refreshResult();
            });
          }
        }]
      },
      PartAvailability: {
        fields: {
          name: Fields.text("Оригинальное название").required(),
          part: Fields.reference("Запчасть", "Part"),
          provider: Fields.reference("Поставщик", "Provider"),
          price: Fields.money("Цена"),
          siteUrl: Fields.text("Сайт"),
          phone: Fields.text("Телефон"),
          sku: Fields.text("Артикул")
        },
        sorting: [['price', 1], ['name', 1]],
        actions: [{
          id: 'reload',
          name: 'Загрузить',
          actionTarget: 'all-items',
          perform: function (Crud, Actions, ExcelParser, Console, Q, Pipes) {
            return Crud.crudFor('Provider').find({}).then(function (providers) {
              return Q.all(providers.map(function (provider) {
                return loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q, Pipes);
              }))
            }).then(function () {
              return Actions.refreshResult();
            })
          }
        }],
        permissions: {
          write: ['admin']
        }
      }
    }
  }
});

function loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q, Pipes) {
  return ExcelParser.parsePartAvailabilities(provider, provider.priceUrl, provider.parseMethod).then(function (availabilities) {
    var parts = Crud.crudFor('PartAvailability');

    availabilities = availabilities.map(function (a) {
      a.siteUrl = provider.siteUrl;
      a.phone = provider.phone;
      return a;
    });

    return Pipes.oneWayImportSync(availabilities, 'PartAvailability', {filtering: {provider: provider.id}}, {
      keyFn: function (i) { return i.name },
      equals: function (a,b) {
        return a.price.toString() === b.price.toString() && a.siteUrl === b.siteUrl && a.phone === b.phone;
      }
    })
  })
}
