var fs = require('fs')
  , path = require('path')
;
var refresh_options = function(config) {
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
                  }
var opts = {
    name: 'Reload database dump',
    button: 'Restore dump',
    params: {

        dump: {
                  label: 'Select dump',
                  type: 'select',
                  refresh_options: refresh_options,
              },
        db: {
                label: 'DB',
                options: ['drupal6'],
            }
    }
};

module.exports = opts;
