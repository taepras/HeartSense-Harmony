var express = require('express')
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/simulate', function(req, res){
  res.sendFile(__dirname + '/views/simulate.html');
});

io.on('connection', function(socket){
  
  let userId = socket.id;
  console.log('id: ', userId, '   CONNECTED');      

  socket.on('i_am_a_display', function (data) {
    socket.join('display');
    console.log(userId, 'is a display')
  });

  socket.on('pulse', function(data){
      console.log('id: ', userId, '   PULSE: ', data);      
      socket.to('display').emit('pulse', {
        userId: userId,
        data: data
      });
  });

  socket.on('pulse_reset', function(data){
    console.log('id: ', userId, '   PULSE_RESET');
    socket.to('display').emit('pulse_reset', {
      userId: userId,
      data: data
    });
  });

  socket.on('disconnect', function(data){
    console.log('id: ', userId, '   DISCONNECTED');
    socket.to('display').emit('user_disconnected', {
      userId: userId,
      data: data
    });
  });
});

// io.on('pulse', function(socket){
//   console.log('pulse');
// });

http.listen(3000, function(){
  console.log('listening on *:3000');
});