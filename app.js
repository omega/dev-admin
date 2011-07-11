#!/usr/bin/env node
/**
 * Module dependencies.
 */

var config = require('confu')(process.cwd(), 'config'
        + (process.env.LOCAL_CONFIG ? "_" + process.env.LOCAL_CONFIG : '') +  '.json');
var express = require('express')
  , fs = require('fs')
  , path = require('path')
  , DATA = { actions: {} }
  , timers = {}
  , spawn = require("child_process").spawn
  ;

var backlog = new Array();
var bash = spawn_shell();

function spawn_shell() {
    backlog = new Array();
    bash = spawn("bash");
    bash.on("exit", function(code) {
        io.sockets.emit("action-done", {'code': code});
        bash = spawn_shell();
    });
    bash.stdout.on("data", function(data) {
        data.toString().split(/\n/).forEach(function(line) {
            //backlog.push(line);
            //while (backlog.length > 80) {
                //backlog.unshift();
            //}
            io.sockets.emit("action-stdout", { text: line });
            backlog.push({text: line, type: 'stdout'});
        });
    });
    bash.stderr.on("data", function(data) {
        data.toString().split(/\n/).forEach(function(line) {
            io.sockets.emit("action-stderr", { text: line });
            backlog.push({text: line, type: 'stderr'});
        });
    });
    bash.run = function(action_config, params, origin) {
        var group = action_config.group;
        var action = action_config.name;

        console.log("RUNNING: ", (group ? group : '(groupless)'), action);
        bash.origin = origin;
        bash.running = true;
        io.sockets.emit('action-new');
        // Need to send params first!
        var write_params = function(list, type) {
            if(!list) return;
            for (var k in list) {
                bash.stdin.write(k + "=" + list[k] + "\n");
                io.sockets.emit('action-variable', {
                    name: k, value: list[k], vtype: type
                });
                backlog.push({
                    name: k, value: list[k], type: 'variable'
                });
            }
        };

        // also check for extra params in config!
        write_params(params, "var");
        if (config.action_groups) write_params(config.action_groups[group]);
        if (config.actions) write_params(config.actions[action]);

        bash.stdin.write("set -e\n"); // Enable exit on error!
        bash.stdin.write("date\n"); // We log the start date, for good show!

        action_config.script.forEach(function(line, i, a) {
            if (line.match(/^\#/)) {
                bash.origin.emit('action-comment', { text: line });
                backlog.push({text: line, type: 'comment'});
            } else {
                io.sockets.emit('action-stdin', { text: line });
                backlog.push({text: line, type: 'stdin'});
                if (config.debug && !line.match(/exit \d+/))
                    line = "echo \"" + line + "\"";
                bash.stdin.write(line + "\n");
            }
            if ((i + 1) == a.length) {
                // This is the end!
                bash.stdin.write("exit 0\n"); // To make sure we exit and spawn a new bash
                io.sockets.emit('action-end');
            }
        });
    }
    bash.running = false;
    return bash;
}





var app = module.exports = express.createServer();

var io = require('socket.io').listen(app);
io.set('log level', 1);
io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);

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
    res.render('action', {
        title: 'dev-admin :: ' + req.params.action,
        hostname: config.hostname,
        "actions": DATA.actions,
        action: DATA.actions[req.params.action]
    });
});

app.listen(8075);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

io.sockets.on("connection", function(socket) {
    if (bash.running) {
        socket.emit("action-scrollback", { lines: backlog });
        bash.origin.broadcast.emit('action-running');
    }
    for (var i in DATA.actions) {
        (function() {
            var e = DATA.actions[i];
            socket.on(e.name, function(data) {
                bash.run(e, data, socket);
            });
        })();
    }
});

/*
timers.refresh_data = setInterval(function() {
    console.log("Refreshing dumps and actions");
    refresh_data();
}, 20000);
*/

function refresh_data() {
    read_actions_from_dir(config.paths.actions);
}
function read_actions_from_dir(dir, group) {
    fs.readdir(dir, function(err, folders) {
        if (err) { return console.error("ERROR reading actions: ", dir, err); }
        console.log("Scanning ", group, " to look for actions");
        for (i in folders) {
            var name = folders[i];
            // Skip some hidden trash
            if (name.match(/^\./)) continue;
            // We do not presently reload actions (require caches anyways)
            if (typeof(DATA.actions[name]) != 'undefined') continue;

            // If there is no script.sh in the folder, we try to process as
            // a action group!
            // XXX: Should prolly not be sync, but for now it is a startup
            // penalty only
            var is_action_group = false;;
            try {
                !fs.statSync(path.join(dir, name, 'script.sh')).isFile();
            } catch (e) {
                // this is probably an action group
                is_action_group = true;
            }
            if (is_action_group) {
                read_actions_from_dir(path.join(dir, name), name); // name is group
            } else {
                var opts;
                try {
                    opts = require(path.join(dir, name, 'params.js'));
                } catch (e) {
                    console.log("Error loading params for " + name);
                }
                console.log("Found action", name, " in group ", group);
                // XXX: The name needs to be unique across action groups right
                // now..
                DATA.actions[name] = {
                    name: name,
                    opts: opts,
                    group: group
                }
                // XXX: Need to walk and update any refresh_options calls!
                //if (typeof(DATA.actions[name].opts.params))
                read_script(DATA.actions[name]);
            }
        }
    });
}

function read_script(action) {
    var script = new fs.ReadStream(path.join(config.paths.actions, (action.group ? action.group : ''), action.name, 'script.sh'));
    action.script = [];
    script.on("data", function(data) {
        data.toString().split(/\n/).forEach(function(line) {
            action.script.push(line);
        });
    });
    script.on("end", function() {
        console.log("Done reading in ", action.name);
    });
}


refresh_data();
