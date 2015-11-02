A.app({
  appName: "МотоBog.ru",
  appIcon: "heart",
  theme: 'cosmic',
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
        referenceName: "name"
      },
      Provider: {
        fields: {
          name: Fields.text("Название").required(),
          priceUrl: Fields.text("Ссылка на прайс-лист").required(),
          siteUrl: Fields.text("Адрес сайта"),
          parseMethod: Fields.text("Метод разбора XLS").required()
        },
        referenceName: "name",
        actions: [{
          id: 'reload',
          name: 'Загрузить',
          actionTarget: 'single-item',
          perform: function (Crud, Actions, ExcelParser, Console, Q) {
            var crud = Crud.actionContextCrud();
            return crud.readEntity(Actions.selectedEntityId()).then(function (provider) {
              return loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q);
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
          siteUrl: Fields.text("Сайт")
        },
        sorting: [['price', 1], ['name', 1]],
        actions: [{
          id: 'reload',
          name: 'Загрузить',
          actionTarget: 'all-items',
          perform: function (Crud, Actions, ExcelParser, Console, Q) {
            return Crud.crudFor('Provider').find({}).then(function (providers) {
              return Q.all(providers.map(function (provider) {
                return loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q);
              }))
            }).then(function () {
              return Actions.refreshResult();
            })
          }
        }]
      }
    }
  }
});

function loadAvailabilityForProvider(provider, Crud, Actions, ExcelParser, Console, Q) {
  return ExcelParser.parsePartAvailabilities(provider, provider.priceUrl, provider.parseMethod).then(function (availabilities) {
    var parts = Crud.crudFor('PartAvailability');

    return parts.find({filtering: {provider: provider.id}}).then(function (toDelete) {
      return Q.all(toDelete.map(function (e) { return parts.deleteEntity(e.id) }));
    }).then(function () {
      return Q.all(availabilities.map(function (a) {
        a.siteUrl = provider.siteUrl;
        return parts.createEntity(a)
      }))
    });
  })
}
