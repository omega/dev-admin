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

var backlog = new Array(80);
var bash = spawn_shell();

function spawn_shell() {

    bash = spawn("bash");
    bash.on("exit", function(code) {
        console.log("EXIT!");
        io.sockets.emit("action-done", {'code': code});
        bash = spawn_shell();
    });
    bash.stdout.on("data", function(data) {
        data.toString().split(/\n/).forEach(function(line) {
            //backlog.push(line);
            //while (backlog.length > 80) {
                //backlog.unshift();
            //}
            console.log("emitting stdout: " + line);
            io.sockets.emit("action-stdout", { text: line });
        });
    });
    bash.stderr.on("data", function(data) {
        data.toString().split(/\n/).forEach(function(line) {
            console.log("STDERR: " + line);
            io.sockets.emit("action-stderr", { text: line });
        });
    });
    bash.run = function(action, params, origin) {
        bash.origin = origin;
        bash.running = true;
        io.sockets.emit('action-new');
        // Need to send params first!
        for ( var k in params ) {
            console.log(k, params[k]);
            bash.stdin.write(k + "=" + params[k] + "\n");
            io.sockets.emit('action-variable', { name: k, value: params[k] });
        }
        var script = new fs.ReadStream(path.join('actions', action, 'script.sh'));
        script.on("data", function(data) {
            data.toString().split(/\n/).forEach(function(line) {
                console.log("Sending to bash: " + line);
                if (line.match(/^\#/)) {
                    bash.origin.emit('action-comment', { text: line });
                } else {
                    io.sockets.emit('action-stdin', { text: line });
                    bash.stdin.write(line + "\n");
                }
            });
        });
        script.on("end", function() {
            io.sockets.emit('action-end');
        });
    }
    bash.running = false;
    return bash;
}





var app = module.exports = express.createServer();

var io = require('socket.io').listen(app);
io.set('log level', 1);
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
app.get('/favicon.ico', function(req, res) { res.send() });
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
    //socket.emit("action-scrollback", { lines: backlog });
    if (bash.running) {
        bash.origin.broadcast.emit('action-running');
    }
    for (var i in DATA.actions) {
        var e = DATA.actions[i];
        console.log(e.name);
        socket.on(e.name, function(data) {
            console.log("Got " + e.name + " event!", data);
            bash.run(e.name, data, socket);
        });
    }
});

/*
timers.refresh_data = setInterval(function() {
    console.log("Refreshing dumps and actions");
    refresh_data();
}, 20000);
*/

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
            }
        }
        DATA.actions = actions;
    });
}

refresh_data();
