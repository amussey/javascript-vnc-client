
var https = require('https');
var url = require('url');

var vnc_url = url.parse(process.argv[2]);
console.log(vnc_url);

var state = 0;
var request = null;
var socket = null;

vnc_url['method'] = 'CONNECT';

var request = https.request(vnc_url, function(res){
  res.on('connect', function(res, socket, head){
    socket.on('data', function(data){
      console.log('SOCKET');
      console.log(data.toString());

      if(state == 0){
        console.log("Buffer Length: " + data.length);
        console.log("Protocol: " + data.toString('ascii', 0, 12));

        state == 1;

        console.log("Bytes written: " + socket.bytesWritten);
        socket.write(new Buffer("RFB 003.003\n1"));
        console.log("Bytes written: " + socket.bytesWritten);
      }else if(state==1){
        console.log("Security:" + data.readUInt(0));
      }else{
        console.log('fuck');
      }
    });
  });
  res.on('data', function(data){
    console.log('RESPONSE');
    console.log(data.toString());
  });
  res.on('end', function(){
    console.log("END");
  });
});
request.setNoDelay(true);
request.on('socket', function(s){
  socket = s;
});
request.on('error', function(e){
  console.error(e);
});
