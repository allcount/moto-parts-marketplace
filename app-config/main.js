A.app({
  appName: "МотоЧасть",
  appIcon: "heart",
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
          priceUrl: Fields.text("Ссылка на прайс-лист")
        },
        referenceName: "name"
      },
      PartAvailability: {
        fields: {
          name: Fields.text("Оригинальное название").required(),
          part: Fields.reference("Запчасть", "Part"),
          provider: Fields.reference("Поставщик", "Provider"),
          price: Fields.money("Цена")
        },
        sorting: [['price', 1]],
        actions: [{
          id: 'reload',
          name: 'Загрузить',
          actionTarget: 'all-items',
          perform: function (Crud, Actions, ExcelParser, Console, Q) {
            return ExcelParser.parsePartAvailabilities({id: "5636a05563002a11001df5fe"}, 'https://downloader.disk.yandex.ru/disk/1523aaa56a70c9be0b90a68e9a0d760beb8b236f0fd2df91f5e5513b19d19e7c/5636d2ad/Iv6FZ6FG008KALydJulMRYyfa5QFzMoeA7zqe0wbWgau9-gmb2Fm_5JGTZPXJQcxCTgS6ekf7IVRdMCmwwloQg%3D%3D?uid=0&filename=%D0%9F%D1%80%D0%B0%D0%B9%D1%81-%D0%BB%D0%B8%D1%81%D1%82%20LBA%20MOTO%20%28%D0%BE%D1%81%D1%82%D0%B0%D1%82%D0%BA%D0%B8%20%D0%BD%D0%B0%2026.10.2015%29.xls&disposition=attachment&hash=LKsBt6e8qdB60B5VlLHJ4P2ViO0GyBs7auLvIC3MK1M%3D%3A/%D0%9F%D1%80%D0%B0%D0%B9%D1%81-%D0%BB%D0%B8%D1%81%D1%82%20LBA%20MOTO%20%28%D0%BE%D1%81%D1%82%D0%B0%D1%82%D0%BA%D0%B8%20%D0%BD%D0%B0%2026.10.2015%29.xls&limit=0&content_type=application%2Fvnd.ms-excel&fsize=2797056&hid=6e0aac954dab7b775b7e5ba9063ad9cb&media_type=document&tknv=v2').then(function (availabilities) {
              var parts = Crud.crudFor('PartAvailability');

              return parts.find({filtering: {provider: "5636a05563002a11001df5fe"}}).then(function (toDelete) {
                return Q.all(toDelete.map(function (e) { return parts.deleteEntity(e.id) }));
              }).then(function () {
                return Q.all(availabilities.map(function (a) { return parts.createEntity(a) })).then(function () {
                  return Actions.refreshResult();
                })
              });
            })
          }
        }]
      }
    }
  }
});
