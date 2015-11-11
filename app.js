var injection = require('allcountjs');
injection.bindFactory('port', process.env.PORT || 9080);
injection.bindFactory('dbUrl', process.env.MONGOLAB_URI || 'mongodb://localhost:27017/motochast');
injection.bindFactory('gitRepoUrl', 'app-config');

injection.bindFactory('ExcelParser', require('./services/excel-parser'));
injection.bindFactory('Scraper', require('./services/scraper'));

var server = injection.inject('allcountServerStartup');
server.startup(function (errors) {
    if (errors) {
        throw new Error(errors.join('\n'));
    }
});
