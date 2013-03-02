
var VncClient = function(stream) {
  this.stream_ = stream;
  this.stream_.on('data', this.ondata_.bind(this));

  this.buffer_ = new Buffer(0);
  this.current_state_ = new ProtocolVersionState();
}

VncClient.prototype = {
  ondata_: function(data){
    console.log(data.toString('ascii'));
    this.buffer_ = Buffer.concat([this.buffer_, data]);
  },
  changeState : function(newState){
    this.current_state_ = newState;
  }
}

var ProtocolVersionServerMessage = function(){
  this.major_version = null;
  this.minor_version = null;
}

ProtocolVersionServerMessage.prototype.read = function(buffer){
  if(buffer.length < 12){
    return false;
  }
  var version_string = buffer.toString('ascii', 0, 12);
  var re = /RFB ([\d]{3}).([\d]{3})/;
  var matches = version_string.match(re);
  if(matches == null){
    throw {
      name: "InvalidExpectationException",
      message: "Expected '" + version_string + "' to match '" + re + "'"
    }
  }
  this.major_version = parseInt(matches[1]);
  this.minor_version = parseInt(matches[2]);
  return buffer.slice(12);
}
ProtocolVersionServerMessage.prototype.toString = function(){
  return '<ProtocolVersionServerMessage: ' + (this.major_version == null ? 'UNREAD>' : 'RFB 00' + this.major_version + '.00' + this.minor_version + '>');
}

ProtocolVersionClientMessage = function(major_version, minor_version){
  this.major_version_ = major_version;
  this.minor_version_ = minor_version;
}
ProtocolVersionClientMessage.prototype.send = function(stream){
  //NOTE: This will fail if VNC ever comes out with a version >= 10
  stream.write("RFB 00" + this.major_version_ + '.00' + this.minor_version_ + '\n', 'ascii');
}
ProtocolVersionClientMessage.prototype.toString = function(){
  return '<ProtocolVersionClientMessage: RFB 00' + this.major_version_ + '.00' + this.minor_version_ + '>';
}

AuthenticationServerMessage = function(){
  this.authentication_scheme = null;
}
AuthenticationServerMessage.prototype.read = function(buffer){
  if(buffer.length < 4){
    return false;
  }
  var authentication_scheme = buffer.readUInt32BE(0);
  if(authentication_scheme == 1){
    this.authentication_scheme = authentication_scheme;
    return buffer.slice(4);
  }
  else if(authentication_scheme == 0){
    if(buffer.length < 8){
      return false;
    }
    var reason_length = buffer.readInt32BE(4);
    if(buffer.length < 8 + reason_length){
      return false;
    }
    this.connection_failure_reason = buffer.toString('ascii', 8, 8 + reason_length);
    this.authentication_scheme = authentication_scheme;
    return buffer.slice(8 + reason_length);
  }else if(authentication_scheme == 2){
    //TODO - Support VNC Authentication
    throw {
      name: 'NotSupportedException',
      message: 'VNC authentication is not currently supported'
    }
  }else{
    throw {
      name: 'InvalidExpectationException',
      message: 'The authentication scheme identified by "' + this.authentication_scheme + '" is not supported'
    }
  }
}
AuthenticationServerMessage.prototype.toString = function(){
  return '<AuthenticationServerMessage: ' + (this.authentication_scheme == null ? 'UNREAD>' : ('Authentication Scheme=' + this.authentication_scheme + '>'));
}
var InitializationClientMessage = function(shared_flag){
  this.shared_flag_ = shared_flag;
}
InitializationClientMessage.prototype.send = function(stream){
  stream.write(new Buffer([this.shared_flag_]));
}

var InitializationServerMessage = function(){
  this.framebuffer_width = null;
  this.framebuffer_height = null;
  this.bits_per_pixel = null;
  this.depth = null;
  this.big_endian = null;
  this.true_color = null;
  this.red_max = null;
  this.blue_max = null;
  this.green_max = null;
  this.red_shift = null;
  this.green_shift = null;
  this.blue_shift = null;
  this.name = null;
}
InitializationServerMessage.prototype.read = function(buffer){
  if(buffer.length < 24){
    return false;
  }
  var name_length = buffer.readUInt32BE(20);
  if(buffer.length < 24 + name_length){
    return false;
  }

  this.framebuffer_width = buffer.readUInt16BE(0);
  this.framebuffer_height = buffer.readUInt16BE(2);
  this.bits_per_pixel = buffer.readUInt8(4);
  this.depth = buffer.readUInt8(5);
  this.big_endian = buffer.readUInt8(6) != 0;
  this.true_color = buffer.readUInt8(7) != 0;
  this.red_max = buffer.readUInt16BE(8);
  this.green_max = buffer.readUInt16BE(10);
  this.blue_max = buffer.readUInt16BE(12);
  this.red_shift = buffer.readUInt8(14);
  this.green_shift = buffer.readUInt8(15);
  this.blue_shift = buffer.readUInt8(16);
  this.name = buffer.toString('ascii', 24, 24 + name_length);
  return buffer.slice(24 + name_length);
}
var SetPixelFormatClientMessage = function(bits_per_pixel, depth, big_endian, true_color, red_max, green_max, blue_max, red_shift, green_shift, blue_shift){
  this.bits_per_pixel_ = bits_per_pixel;
  this.depth_ = depth;
  this.big_endian_ = big_endian;
  this.true_color_ = true_color;
  this.red_max_ = red_max;
  this.green_max_ = green_max;
  this.blue_max_ = blue_max;
  this.red_shift_ = red_shift;
  this.green_shift_ = green_shift;
  this.blue_shift_ = blue_shift;
}
SetPixelFormatClientMessage.prototype.send = function(stream){
  var buffer = new Buffer(20);
  buffer.writeUInt8(0x00, 0);
  buffer.writeUInt8(this.bits_per_pixel_, 1);
  buffer.writeUInt8(this.depth_, 2);
  buffer.writeUInt8(this.big_endian_ ? 0x01 : 0x00, 3);
  buffer.writeUInt8(this.true_color_ ? 1 : 0, 4);
  buffer.writeUInt16BE(this.red_max_, 5);
  buffer.writeUInt16BE(this.green_max_, 7);
  buffer.writeUInt16BE(this.blue_max_, 9);
  buffer.writeUInt8(this.red_shift_, 11);
  buffer.writeUInt8(this.green_shift_, 12);
  buffer.writeUInt8(this.blue_shift_, 13);
  buffer.writeUInt8(0x00, 14);
  buffer.writeUInt8(0x00, 15);
  buffer.writeUInt8(0x00, 16);
  stream.write(buffer);
}
//TODO - Color Map Client Message
//TODO - Set Encoding Client Message
var FramebufferUpdateRequestClientMessage = function(incremental, x, y, width, height){
  this.incremental_ = incremental;
  this.x_ = x;
  this.y_ = y;
  this.width_ = width;
  this.height_ = height;
}
FramebufferUpdateRequestClientMessage.prototype.send = function(stream){
  var buffer = new Buffer(10);
  buffer.writeUInt8(3, 0);
  buffer.writeUInt8(this.incremental_, 1);
  buffer.writeUInt16BE(this.x_, 2);
  buffer.writeUInt16BE(this.y_, 4);
  buffer.writeUInt16BE(this.width_, 6);
  buffer.writeUInt16BE(this.height_, 8);
  stream.write(buffer);
}

var KeyEventClientMessage = function(is_down, key){
  this.is_down_ = is_down;
  this.key_ = key;
}
KeyEventClientMessage.prototype.send = function(stream){
  var buffer = new Buffer(8);
  buffer.writeUInt8(4, 0);
  buffer.writeUInt8(this.is_down_ ? 1 : 0, 1);
  buffer.writeUInt16BE(0, 2);
  buffer.writeUInt32BE(this.key_, 4);
  stream.write(buffer);
}

var PointerEventClientMessage = function(button_mask, x, y){
  this.button_mask_ = button_mask;
  this.x_ = x;
  this.y_ = y;
}
PointerEventClientMessage.prototype.send = function(stream){
  var buffer = new Buffer(6);
  buffer.writeUInt8(5, 0);
  buffer.writeUInt8(this.button_mask_, 1);
  buffer.writeUInt16BE(this.x_, 2);
  buffer.writeUInt16BE(this.y_, 4);
  stream.write(buffer);
}

//TODO - ClientCut Message

var FramebufferUpdateServerMessage = function(){
  this.rectangles = [];
}
FramebufferUpdateServerMessage.prototype.read = function(buffer){

}

var ProtocolVersionState = function(context){
  this.context_ = context;
}
ProtocolVersionState.prototype.onData = function(data){
  var serverMessage = new ProtocolVersionServerMessage();
  message.read(data);

  //TODO - Probably need to get this from a larger context
  var clientMessage = new ProtocolVersionClientMessage(3,3);
  clientMessage.send(this.context_.stream_);

  this.context_.changeState(new AuthenticationState(context));
}
var AuthenticationState = function(context){
  this.context_ = context;
}
AuthenticationState.onData = function(data){
  var serverMessage = new AuthenticationServerMessage();
  serverMessage.read(data);

  //TODO Need a better way to get approval on this
  var clientMessage = new InitializationClientMessage(1);
  clientMessage.send(this.context_.stream_);
};

module.exports = {
  VncClient: VncClient,
  ProtocolVersionServerMessage: ProtocolVersionServerMessage,
  ProtocolVersionClientMessage: ProtocolVersionClientMessage,
  AuthenticationServerMessage: AuthenticationServerMessage,
  InitializationClientMessage: InitializationClientMessage,
  InitializationServerMessage: InitializationServerMessage,
  SetPixelFormatClientMessage: SetPixelFormatClientMessage,
  FramebufferUpdateRequestClientMessage: FramebufferUpdateRequestClientMessage,
  KeyEventClientMessage: KeyEventClientMessage,
  PointerEventClientMessage: PointerEventClientMessage
}
