
var url = require('url');
var tls = require('tls');

var vnc_url = url.parse(process.argv[2]);
console.log(vnc_url);

var state = 0;

var stream = tls.connect(vnc_url.port, vnc_url.hostname, function(){
  console.log('Connected!');
  stream.write('CONNECT ' + vnc_url.path + ' HTTP/1.0\r\n\r\n');
});


stream.on('data', function(data){
  console.log('SOCKET');
  var i = 0;

  console.log("Buffer Length: " + data.length);
  console.log(data.toString());
  if (state == 0){
    var http_data = '';
    for(;i<data.length && http_data.indexOf('\r\n\r\n') == -1;i++){
      http_data += data.toString('ascii', i, i+1);
      console.log(i);
      console.log(http_data);
    }
    if(http_data.indexOf('\r\n\r\n') == -1){
      throw 'Shit';
    }

    state = 1;
  }


  if(state == 1 && (data.length - i) >= 12){
    console.log("Protocol: " + data.toString('ascii', i, i+12));
    i+=12;
    state = 2;

    stream.write(new Buffer("RFB 003.003\n"));
  }

  if(state==2 && (data.length - i) >= 4){
    console.log("Security:" + data.readUInt32BE(i));
    i+=4;
    state = 3;

    var buffer = new Buffer(1);
    buffer.writeUInt8(1, 0);

    stream.write(buffer);
  }

  if((data.length - i) != 0){
    console.log("DIDN'T handle all data: " + data.toString('ascii', i));
  }
});
