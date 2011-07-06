$(document).ready(function() {
    var socket = io.connect('/');
    /*
    socket.on('hello', function(data) {
        console.log("Got hello: ", data);
        socket.emit("reset-db", { dump: 'my-other-dump.tgz' });
    });
    */
    $('form').submit(function() {
        // XXX: Need to generalize this to support more actions
        var dump = { dump: $('#dump').val(), db: "drupal6" }; // XXX: hardcoded db name
        var action = window.location.pathname.match(/^\/([a-z]*)/)[1];
        console.log(action);
        socket.emit(action, dump);
        $('#log').empty();
        $('.console').removeClass('ok error');
        socket.on("action-done", function(code) {
            if (code.code == 0) {
                // All is good
                $('.console').addClass("ok");
            } else {
                $('.console').addClass('error');
            }
            $('#log').append("<li class='end'>ACTION EXITED: " + code.code + '</li>');
        });
        socket.on("action-stdout", function(data) {
            $('#log').append('<li>' + data.text + '</li>');
        });
        socket.on("action-stderr", function(data) {
            $('#log').append('<li class="error">' + data.text + '</li>');
        });

        return false;
    });
});




