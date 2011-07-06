#!/usr/bin/env node
/**
 * Module dependencies.
 */

var config = require('confu')(__dirname, 'config.json');
var express = require('express')
  , fs = require('fs')
  , path = require('path')
  , DATA = {}
  , timers = {}
  , spawn = require("child_process").spawn
  ;

var app = module.exports = express.createServer();

var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
    res.render('index', {
        title: 'dev-admin',
        hostname: config.hostname,
        "actions": DATA.actions
    });
});
app.get('/:action', function(req, res) {
    res.render(req.params.action, {
        title: 'dev-admin :: ' + req.params.action,
        hostname: config.hostname,
        "actions": DATA.actions,
        "dumps": DATA.dumps
    });
});

app.listen(8075);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

io.sockets.on("connection", function(socket) {
    socket.emit("hello", { hello: "world" });
    for (var i in DATA.actions) {
        var e = DATA.actions[i];
        console.log(e.name);
        socket.on(e.name, function(data) {
            console.log("Got " + e.name + " event!", data);
            DATA.actions[e.name].cb(e.name, data, socket);
        });
    }
});

timers.refresh_data = setInterval(function() {
    console.log("Refreshing dumps and actions");
    refresh_data();
}, 20000);


function refresh_data() {
    fs.readdir(config.paths.dumps, function(err, files) {
        if (err) { return console.error("ERROR reading dumps: ", err); }
        var dumps = {};

        for (i in files) {
            var file = files[i];
            var name = path.basename(file, path.extname(file));
            dumps[name] = {
                file: path.join(config.paths.dumps, file),
                name: name
            };
        }
        DATA.dumps = dumps;
    });
    fs.readdir(config.paths.actions, function(err, folders) {
        if (err) { return console.error("ERROR reading actions: ", err); }
        var actions = {};

        for (i in folders) {
            var name = folders[i];
            if (name.match(/^\./)) continue;
            // XXX: Should ad something here for the form/input params!
            actions[name] = {
                name: name,
                cb: require(path.join(config.paths.actions, name, 'callback.js'))
            }
        }
        DATA.actions = actions;
    });
}

refresh_data();
