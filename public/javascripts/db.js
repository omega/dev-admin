var spitters = {
    'variable': function(data) {
        $('#log').append('<li class="var">' + data.name + "=" + data.value + '</li>');
    },
    'stdin': function(data) {
        $('#log').append('<li class="input">' + fix_ansi(data.text) + '</li>');
    },
    'stderr': function(data) {
        $('#log').append('<li class="error">' + fix_ansi(data.text) + '</li>');
    },
    'stdout': function(data) {
        $('#log').append('<li>' + fix_ansi(data.text) + '</li>');
    }
};
$(document).ready(function() {
    var socket = io.connect('/');
    socket.on("action-done", function(code) {
        if (code.code == 0) {
            // All is good
            $('.console').addClass("ok");
        } else {
            $('.console').addClass('error');
        }
        $('#log').append("<li class='end'>ACTION EXITED: " + code.code + '</li>');
        $('form').attr('running', 'stopped');
        $('.console').removeClass('running');
    });
    socket.on("action-stdout", spitters.stdout);
    socket.on("action-stderr", spitters.stderr);
    socket.on('action-stdin', spitters.stdin);
    socket.on('action-variable', spitters.variable);

    socket.on('action-new', function() {
        $('#log').empty();
        $('.console').removeClass('ok error');
        $('.console').addClass('running');
        $('form').attr('running', 'running');
    });
    socket.on('action-running', function() {
        // We are already in a running shell!
        $('.console').addClass('running');
        $('form').attr('running', 'running');
    });
    socket.on('action-scrollback', function(data) {
        for (var i in data.lines) {
            var d = data.lines[i];
            // Need to spit it out
            if (spitters[d.type]) {
                spitters[d.type](d);
            }
        }
    });

    $('form').submit(function() {
        // XXX: Need to generalize this to support more actions
        if ($('form').attr('running') == 'running') {
            return false;
        }
        var dump = { dump: $('#dump').val(), db: "drupal6" }; // XXX: hardcoded db name
        var action = window.location.pathname.match(/^\/([a-z]*)/)[1];
        socket.emit(action, dump);
        return false;
    });
});

    var col_to_class = {
        30: 'black',
        31: 'red',
        32: 'green',
        33: 'yellow',
        34: 'blue',
        35: 'magenta',
        36: 'cyan',
        37: 'white'
    };
function fix_ansi(intxt) {
    var txt = intxt.toString(); // just to make sure, and get a copy
    var ansi = /\x1b\x5b([\d;]+)m/;
    var res = txt.match(ansi);
    var cur_fg, cur_bg;
    var stack = []
      , flags = { b: false, u: false, bl: false, rev: false, con: false }
    ;
    while (res) {
        var replacement = '';
        if (res[1] == 0) {
            while (stack.length) {
                var e = stack.pop();
                replacement = replacement + "</span>";
            }
        } else {
            var parts = res[1].split(';');
            for (var i in parts) {
                var v = parts[i];
                var cls = '';
                if (v < 10) {
                    // attribute change, ignore for now
                } else if (v >= 40) {
                    cls = cls + 'bg' + col_to_class[v - 10];
                } else {
                    cls = col_to_class[v];
                }
                if (cls != '') {
                    replacement = replacement + '<span class="' + cls + '">';
                    stack.push(v);
                }
                // XXX: Should really check so we replace other bg and fg
                // colors in stack!
            }
        }
        txt = txt.replace(res[0], replacement);

        res = txt.match(ansi);
    }
    // If we have anything in the stack at this point, lets pop and close!
    if (intxt.toString() != txt) {
        // We wrap in a global 'ansi' class span
        txt = '<span class="ansi">' + txt + '</span>';
    }
    return txt;
}

