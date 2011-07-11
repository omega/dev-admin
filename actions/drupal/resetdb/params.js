var config = require('confu')(__dirname + '../../', 'config'
        + (process.env.LOCAL_CONFIG ? "_" + process.env.LOCAL_CONFIG : '') +  '.json');
var fs = require('fs')
  , path = require('path')
;
var opts = {
    name: 'Reload database dump',
    button: 'Restore dump',
    params: {

        dump: {
                  label: 'Select dump',
                  type: 'select',
                  refresh_options: function() {
                      console.log("in refresh_options");
                      fs.readdir(config.paths.dumps, function(err, files) {
                          if (err) { return console.error("ERROR reading dumps: ", err); }
                          var dumps = [];

                          for (i in files) {
                              var file = files[i];
                              //var name = path.basename(file, path.extname(file));
                              dumps.push(path.join(config.paths.dumps, file));
                          }
                          opts.params.dump.options = dumps
                      });
                  }(),
                  options: []
              },
        db: {
                label: 'DB',
                options: ['drupal6'],
            }
    }
};

module.exports = opts;
