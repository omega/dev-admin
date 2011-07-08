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
    socket.on("action-stdout", function(data) {
        $('#log').append('<li>' + data.text + '</li>');
    });
    socket.on("action-stderr", function(data) {
        $('#log').append('<li class="error">' + data.text + '</li>');
    });
    socket.on('action-stdin', function(data) {
        $('#log').append('<li class="input">' + data.text + '</li>');
    });
    socket.on('action-new', function() {
        $('#log').empty();
        $('.console').removeClass('ok error');
        $('.console').addClass('running');
        $('form').attr('running', 'running');
    });
    socket.on('action-variable', function(data) {
        $('#log').append('<li class="var">' + data.name + "=" + data.value + '</li>');
    });
    socket.on('action-running', function() {
        // We are already in a running shell!
        $('.console').addClass('running');
        $('form').attr('running', 'running');
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




