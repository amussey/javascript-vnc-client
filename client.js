
var https = require('https');

var url = process.argv[2];
console.log(url);

var state = 0;
var request = null;
var socket = null;

var request = https.get(url, function(res){
  res.on('data', function(data){

    if(state == 0){
      console.log("Buffer Length: " + data.length);
      console.log("Protocol: " + data.toString('ascii', 0, 12));

      state == 1;

      console.log("Bytes written: " + socket.bytesWritten);
      request.write(new Buffer("RFB 003.003\n1", 'ascii'));
      console.log("Bytes written: " + socket.bytesWritten);
    }else if(state==1){
      console.log("Security:" + data.readUInt(0));
    }else{
      console.log('fuck');
    }
  });

  res.on('end', function(){
    console.log("END");
  });
});
request.setNoDelay(true);
request.on('socket', function(s){
  socket = s;
  console.log(socket);
});
 
request.on('error', function(e){
  console.error(e);
});
