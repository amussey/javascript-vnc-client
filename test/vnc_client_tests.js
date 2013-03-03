
var should = require('chai').should();
var util = require('util');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;

var vncClient = require('../vnc_client');
var MockStream = function(){
}
util.inherits(MockStream, EventEmitter);

describe('VncClient', function(){
  describe('stream data handling', function(){
    //TODO - Don't like testing internals but I don't really know how else to handle this
    it('appends additional data to buffer when multiple data events occur', function(){
      var mockStream = new MockStream();
      var client = new vncClient.VncClient(mockStream);

      mockStream.emit('data', new Buffer('1', 'ascii'));
      mockStream.emit('data', new Buffer('2', 'ascii'));
      client.buffer_.toString().should.equal('12');
    });
  });
});

describe('ProtocolVersionServerMessage', function(){
  describe('read()', function(){
    var message = new vncClient.ProtocolVersionServerMessage();
    it('returns false if buffer isn\'t long enough', function(){
      message.read(new Buffer('RFB 003.003', 'ascii')).should.be.false;
    });
    it('throws error if it can\'t parse the version', function(){
      (function () { message.read(new Buffer('RFB asd.asd\n', 'ascii'))}).should.throw();
    });
    it('should parse out major version #', function(){
      message.read(new Buffer('RFB 003.007\n', 'ascii'))
      message.major_version.should.equal(3);
    });
    it('should parse out minor version #', function(){
      message.read(new Buffer('RFB 003.007\n', 'ascii'))
      message.minor_version.should.equal(7);
    });
    it('should return buffer of remaining data', function(){
      message.read(new Buffer('RFB 003.007\ntext after version line', 'ascii')).toString().should.equal('text after version line');
    });
  });
  describe('toString()', function(){
    var message = new vncClient.ProtocolVersionServerMessage();
    it('should return name and status if unread', function(){
      message.toString().should.equal('<ProtocolVersionServerMessage: UNREAD>');
    });
    it('should return name and status if unread', function(){
      message.read(new Buffer('RFB 003.007\n'));
      message.toString().should.equal('<ProtocolVersionServerMessage: RFB 003.007>');
    });
  });
});

describe('ProtocolVersionClientMessage', function(){
  describe('send()', function(){
    var message = new vncClient.ProtocolVersionClientMessage(3,7);
    var mockStream = new MockStream();
    it('should send version header with appropriate major version and minor version', function(){
      mockStream.write = sinon.spy();
      message.send(mockStream);
      mockStream.write.calledWith('RFB 003.007\n', 'ascii').should.be.true;
    });
  });
  describe('toString()', function(){
    var message = new vncClient.ProtocolVersionClientMessage(3,7);
    it('should return class name and version string', function(){
      message.toString().should.equal('<ProtocolVersionClientMessage: RFB 003.007>');
    });
  });
});

describe('AuthenticationServerMessage', function(){
  describe('read()', function(){
    var message = null;
    beforeEach(function(){
      message = new vncClient.AuthenticationServerMessage();
    });
    it('should return false if < 4 bytes in the response', function(){
      message.read(new Buffer([0x00, 0x00])).should.be.false;
    });
    it('should set authentication scheme to no authentication', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x01]));
      message.authentication_scheme.should.equal(1);
    });
    it('should return buffer minus 4 bytes if no authentication', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x01, 0x00])).length.should.equal(1);
    });
    it('should return false if connection failure reason length not supplied on connection failure', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x00])).should.be.false;
    });
    it('should return false if connectionn failure reason not supplised on conection failure', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00])).should.be.false;
    });
    it('should set connection failure reason', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x52, 0x52]))
      message.connection_failure_reason.should.equal('RR');
    });
    it('should return buffer minus 8 bytes and reason length if connection failed', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x52, 0x52, 0x00])).length.should.equal(1);
    });
    it('should throw exception if VNC authentication is returned', function(){
      (function() { message.read(new Buffer([0x00, 0x00, 0x00, 0x02])) }).should.throw();
    });
    it('should throw exception if unsupported authentication scheme is requested', function(){
      (function() { message.read(new Buffer([0x00, 0x00, 0x00, 0x04])) }).should.throw();
    });
  });
  describe('toString()', function(){
    var message = null;
    beforeEach(function(){
        message = new vncClient.AuthenticationServerMessage();
    });
    it('should return UNREAD and classname if not processed', function(){
      message.toString().should.equal('<AuthenticationServerMessage: UNREAD>');
    });
    it('should return classname and info if read', function(){
      message.toString().should.equal('<AuthenticationServerMessage: UNREAD>');
    });
  });
});

describe('InitializationClientMessage', function(){
  describe('send()' , function(){
    var message = new vncClient.InitializationClientMessage(1);
    var mockStream = new MockStream();
    it('should send 1 for shared flag', function(){
      mockStream.write = sinon.spy();
      message.send(mockStream);
      mockStream.write.calledOnce.should.be.true;
      mockStream.write.firstCall.args[0].length.should.equal(1);
      mockStream.write.firstCall.args[0][0].should.equal(0x01);
    });
  });
  describe('toString()', function(){
  });
});
describe('InializaitonServerMessage', function(){
  describe('read() with non-zero data', function(){
    var message, result = null;
    beforeEach(function(){
      message = new vncClient.InitializationServerMessage();
      result = message.read(new Buffer([0x00, 0x01, 0x00, 0x02, 0x03, 0x04, 0x05, 0x06, 0x00, 0x07, 0x00, 0x08, 0x00, 0x09, 0x0A, 0x0B, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x41]));
    });
    it('should return empty buffer', function(){
      result.length.should.equal(0);
    });
    it('should return 1 for the framebuffer size', function(){
      message.framebuffer_width.should.equal(1);
    });
    it('should return 2 for framebuffer height', function(){
      message.framebuffer_height.should.equal(2);
    })
    it('should return 3 for bits-per-pixel', function(){
      message.bits_per_pixel.should.equal(3);
    });
    it('should return 4 for depth', function(){
      message.depth.should.equal(4);
    });
    it('should return true for Big Endian', function(){
      message.big_endian.should.be.true;
    });
    it('should return true for true color', function(){
      message.true_color.should.be.true;
    });
    it('should return 7 for red max', function(){
      message.red_max.should.equal(7);
    });
    it('should return 8 for green max', function(){
      message.green_max.should.equal(8);
    });
    it('should return 9 for blue max', function(){
      message.blue_max.should.equal(9);
    });
    it('should return 10 for red shift', function(){
      message.red_shift.should.equal(10);
    });
    it('should return 11 for green shift', function(){
      message.green_shift.should.equal(11);
    });
    it('should return 12 for blue shift', function(){
      message.blue_shift.should.equal(12);
    });
    it('should return "A" for name', function(){
      message.name.should.equal('A');
    });
  });
  describe('read() with zero data', function(){
    var message, result = null;
    beforeEach(function(){
      message = new vncClient.InitializationServerMessage();
      result = message.read(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    });
    it('should return empty buffer', function(){
      result.length.should.equal(0);
    });
    it('should return 0 for the framebuffer size', function(){
      message.framebuffer_width.should.equal(0);
    });
    it('should return 0 for framebuffer height', function(){
      message.framebuffer_height.should.equal(0);
    })
    it('should return 0 for bits-per-pixel', function(){
      message.bits_per_pixel.should.equal(0);
    });
    it('should return 0 for depth', function(){
      message.depth.should.equal(0);
    });
    it('should return false for Big Endian', function(){
      message.big_endian.should.be.false;
    });
    it('should return false for true color', function(){
      message.true_color.should.be.false;
    });
    it('should return 0 for red max', function(){
      message.red_max.should.equal(0);
    });
    it('should return 0 for green max', function(){
      message.green_max.should.equal(0);
    });
    it('should return 0 for blue max', function(){
      message.blue_max.should.equal(0);
    });
    it('should return 0 for red shift', function(){
      message.red_shift.should.equal(0);
    });
    it('should return 0 for green shift', function(){
      message.green_shift.should.equal(0);
    });
    it('should return 0 for blue shift', function(){
      message.blue_shift.should.equal(0);
    });
  });
  describe('read() with not enough data', function(){
    var message = null;
    beforeEach(function(){
      message = new vncClient.InitializationServerMessage();
    });
    it('should return false with not a long enough name', function(){
      message.read(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])).should.be.false;
    });
    it('should return false with not a long enough buffer', function(){
      message.read(new Buffer([0x00])).should.be.false;
    });
  });
});

describe('SetPixelFormatClientMessage', function(){
  describe('send()', function(){
    var message = null;
    var mockStream = new MockStream();
    beforeEach(function(){
      mockStream.write = sinon.spy();
      message = new vncClient.SetPixelFormatClientMessage(0, 1, true, true, 2, 3, 4, 5, 6, 7,8);
      message.send(mockStream);
    });
    it('should write 0 for message type', function(){
      mockStream.write.firstCall.args[0][0].should.equal(0);
    });
    it('should write 0 for bits_per_pixel', function(){
      mockStream.write.firstCall.args[0][1].should.equal(0);  
    });
    it('should write 1 for depth', function(){
      mockStream.write.firstCall.args[0][2].should.equal(1);
    });
    it('should not write 0 for big endian', function(){
      mockStream.write.firstCall.args[0][3].should.not.equal(0);
    });
    it('should not write 0 for true color', function(){
      mockStream.write.firstCall.args[0][4].should.not.equal(0);
    });
    it('should write 2 for red max', function(){
      mockStream.write.firstCall.args[0][5].should.equal(0);
      mockStream.write.firstCall.args[0][6].should.equal(2);
    });
    it('should write 3 for green max', function(){
      mockStream.write.firstCall.args[0][7].should.equal(0);
      mockStream.write.firstCall.args[0][8].should.equal(3);
    });
    it('should write 4 for blue max', function(){
      mockStream.write.firstCall.args[0][9].should.equal(0);
      mockStream.write.firstCall.args[0][10].should.equal(4);
    });
    it('should write 5 for true color', function(){
      mockStream.write.firstCall.args[0][11].should.equal(5);
    });
    it('should write 6 for true color', function(){
      mockStream.write.firstCall.args[0][12].should.equal(6);
    });
    it('should write 7 for true color', function(){
      mockStream.write.firstCall.args[0][13].should.equal(7);
    });
    it('should write 3 padding bytes', function(){
      mockStream.write.firstCall.args[0][14].should.equal(0);
      mockStream.write.firstCall.args[0][15].should.equal(0);
      mockStream.write.firstCall.args[0][16].should.equal(0);
    });
  });
});

//TODO - This type of testing is fragile...
describe('FramebufferUpdateRequestClientMessage', function(){
  describe('send()', function(){
    var message = null;
    var mockStream = new MockStream();
    beforeEach(function(){
      mockStream.write = sinon.spy();
      message = new vncClient.FramebufferUpdateRequestClientMessage(1, 2, 3, 4, 5, 6);
      message.send(mockStream);
    });
    it('should write 3 for message type', function(){
      mockStream.write.firstCall.args[0][0].should.equal(3);
    });
    it('should write 1 for incremental', function(){
      mockStream.write.firstCall.args[0][1].should.equal(1);
    });
    it('should write 2 for x-position', function(){
      mockStream.write.firstCall.args[0][2].should.equal(0);
      mockStream.write.firstCall.args[0][3].should.equal(2);
    });
    it('should write 3 for y-position', function(){
      mockStream.write.firstCall.args[0][4].should.equal(0);
      mockStream.write.firstCall.args[0][5].should.equal(3);
    });
    it('should write 4 for width', function(){
      mockStream.write.firstCall.args[0][6].should.equal(0);
      mockStream.write.firstCall.args[0][7].should.equal(4);
    });
    it('should write 5 for height', function(){
      mockStream.write.firstCall.args[0][8].should.equal(0);
      mockStream.write.firstCall.args[0][9].should.equal(5);
    });
  });
});

describe('KeyEventClientMessage', function(){
  describe('send()', function(){
    var message = null;
    var mockStream = new MockStream();
    beforeEach(function(){
      mockStream.write = sinon.spy();
      message = new vncClient.KeyEventClientMessage(true, 5);
      message.send(mockStream);
    });
    it('should write 4 for message type', function(){
      mockStream.write.firstCall.args[0][0].should.equal(4);
    });
    it('should write non-zero for down_flag', function(){
      mockStream.write.firstCall.args[0][1].should.not.equal(0);
    });
    it('should write padding', function(){
      mockStream.write.firstCall.args[0][2].should.equal(0);
      mockStream.write.firstCall.args[0][3].should.equal(0);
    });
    it('should write 5 for key', function(){
      mockStream.write.firstCall.args[0][4].should.equal(0);
      mockStream.write.firstCall.args[0][5].should.equal(0);
      mockStream.write.firstCall.args[0][6].should.equal(0);
      mockStream.write.firstCall.args[0][7].should.equal(5);
    });
  });
});

describe('PointerEventClientMessage', function(){
  describe('send()', function(){
    var message = null;
    var mockStream = new MockStream();
    beforeEach(function(){
      mockStream.write = sinon.spy();
      message = new vncClient.PointerEventClientMessage(255, 1, 2);
      message.send(mockStream);
    });
    it('should write 5 for message type', function(){
      mockStream.write.firstCall.args[0][0].should.equal(5);
    });
    it('should write 255 for button_mask', function(){
      mockStream.write.firstCall.args[0][1].should.equal(255);
    });
    it('should write 1 for x', function(){
      mockStream.write.firstCall.args[0][2].should.equal(0);
      mockStream.write.firstCall.args[0][3].should.equal(1);
    });
    it('should write 2 for y', function(){
      mockStream.write.firstCall.args[0][4].should.equal(0);
      mockStream.write.firstCall.args[0][5].should.equal(2);
    });
  });
});

describe('SetEncodingClientMessage', function(){
  describe('send()', function(){
    var message = null;
    var mockStream = new MockStream();
    beforeEach(function(){
      mockStream.write = sinon.spy();
      message = new vncClient.SetEncodingClientMessage([1, -1]);
      message.send(mockStream);
    });
    it('should write 2 for message type', function(){
      mockStream.write.firstCall.args[0][0].should.equal(2);
    });
    it('should write padding', function(){
      mockStream.write.firstCall.args[0][1].should.equal(0x00);
    });
    it('should write 2 for number of encodings', function(){
      mockStream.write.firstCall.args[0][2].should.equal(0);
      mockStream.write.firstCall.args[0][3].should.equal(2);
    });
    it('should write 1 for first encoding', function(){
      mockStream.write.firstCall.args[0][4].should.equal(0);
      mockStream.write.firstCall.args[0][5].should.equal(1);
    });
    it('should write -1 for second encoding', function(){
      mockStream.write.firstCall.args[0][6].should.equal(0xff);
      mockStream.write.firstCall.args[0][7].should.equal(0xff);
    });
  });
});

describe('RawEncoding', function(){
  it('should return false if not enough data', function(){
    var encoding = new vncClient.RawEncoding(1, 1, 8, true);
    encoding.read(new Buffer([])).should.be.false;
  });
  it('should return buffer with 1 entry', function(){
    var encoding = new vncClient.RawEncoding(1, 1, 8, true);
    encoding.read(new Buffer([0x05, 0x02])).should.have.length(1);
  });
  describe('read 1x1x8 Big Endian pixel', function(){
    var encoding = new vncClient.RawEncoding(1, 1, 8, true);
    var buffer = encoding.read(new Buffer([0x05]));
    it('should read 1 pixel', function(){
      encoding.pixels.should.have.length(1);
      encoding.pixels[0].should.have.length(1);
    });
    it('should have pixel of value 5', function(){
      encoding.pixels[0][0].should.equal(5);
    });
    it('should return empty buffer', function(){
      buffer.length.should.equal(0);
    });
  });
  describe('read 2x2x16 Big Endian pixel (with 1 extra padding at end)', function(){
    var encoding = new vncClient.RawEncoding(2, 2, 16, true);
    var buffer = encoding.read(new Buffer([0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00]));
    it('should read 2x2 pixels', function(){
      encoding.pixels.should.have.length(2);
      encoding.pixels[0].should.have.length(2);
      encoding.pixels[1].should.have.length(2);
    });
    it('should have correct pixel values', function(){
      encoding.pixels[0][0].should.equal(1);
      encoding.pixels[0][1].should.equal(2);
      encoding.pixels[1][0].should.equal(3);
      encoding.pixels[1][1].should.equal(4);
    });
    it('should return buffer with 1 entry', function(){
      buffer.length.should.equal(1);
    });
  });
  describe('read 1x1x32 Little Endian pixel', function(){
    var encoding = new vncClient.RawEncoding(1, 1, 32, false);
    var buffer = encoding.read(new Buffer([0x01, 0x00, 0x00, 0x00]));
    it('should read 1x1 pixels', function(){
      encoding.pixels.should.have.length(1);
      encoding.pixels[0].should.have.length(1);
    });
    it('should have correct pixel values', function(){
      encoding.pixels[0][0].should.equal(1);
    });
  });
  describe('read 2x2x16 Little Endian pixel', function(){
    var encoding = new vncClient.RawEncoding(2, 2, 16, false);
    encoding.read(new Buffer([0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00]));
    it('should read 2x2 pixels', function(){
      encoding.pixels.should.have.length(2);
      encoding.pixels[0].should.have.length(2);
      encoding.pixels[1].should.have.length(2);
    });
    it('should have correct pixel values', function(){
      encoding.pixels[0][0].should.equal(1);
      encoding.pixels[0][1].should.equal(2);
      encoding.pixels[1][0].should.equal(3);
      encoding.pixels[1][1].should.equal(4);
    });
  });
  describe('read 1x1x32 Big Endian pixel', function(){
    var encoding = new vncClient.RawEncoding(1, 1, 32, true);
    encoding.read(new Buffer([0x00, 0x00, 0x00, 0x01]));
    it('should read 1x1 pixels', function(){
      encoding.pixels.should.have.length(1);
      encoding.pixels[0].should.have.length(1);
    });
    it('should have correct pixel values', function(){
      encoding.pixels[0][0].should.equal(1);
    });
  });
  describe('bad bits per pixel', function(){
    it('should throw error when passed 24 bits per pixel', function(){
      (function(){ new vncClient.RawEncoding(1, 1, 24)}).should.throw();
    });
  });
});

describe('FramebufferUpdateServerMessage', function(){
  it('should return false if there is not enough data to parse', function(){
    (new vncClient.FramebufferUpdateServerMessage(8, true)).read(new Buffer([])).should.be.false;
  });
  it('should return false if there is a number of rectangles but not enough data', function(){
    (new vncClient.FramebufferUpdateServerMessage(8, true)).read(new Buffer([0x00, 0x00, 0x01])).should.be.false;
  });
  it('should return false if there is not enough encoding data', function(){
    (new vncClient.FramebufferUpdateServerMessage(8, true)).read(new Buffer([0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])).should.be.false;
  });
  describe('read() 1 rectangle', function(){
    var message, result = null;
    beforeEach(function(){
      message = new vncClient.FramebufferUpdateServerMessage(8, true);
      result = message.read(new Buffer([0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01]));
    });
    it('should have 1 rectangle', function(){
      message.rectangles.should.have.length(1);
    });
    it('should have 2 for x', function(){
      message.rectangles[0].x.should.equal(2);
    });
    it('should have 3 for y', function(){
      message.rectangles[0].y.should.equal(3);
    });
    it('should have 1 for width', function(){
      message.rectangles[0].width.should.equal(1);
    });
    it('should have 1 for height', function(){
      message.rectangles[0].height.should.equal(1);
    });
    it('should have 0 for encoding', function(){
      message.rectangles[0].encoding.should.equal(0);
    });
    it('should have raw encoding data', function(){
      message.rectangles[0].data.should.be.instanceOf(vncClient.RawEncoding);
    });
    //This test kind of duplicates
    it('should have raw encoding data pixel', function(){
      message.rectangles[0].data.pixels[0][0].should.equal(1);
    });
  });
  describe('read() 2 rectangles', function(){
    var message, result = null;
    beforeEach(function(){
      message = new vncClient.FramebufferUpdateServerMessage(16, true);
      result = message.read(new Buffer([
        0x00, 0x00, 0x02, 
        0x00, 0x02, 0x00, 0x03, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x01, 
        0x00, 0x04, 0x00, 0x05, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04]));
    });
    it('should have 2 rectangles', function(){
      message.rectangles.should.have.length(2);
    });
    it('should have 4 for x', function(){
      message.rectangles[1].x.should.equal(4);
    });
    it('should have 5 for y', function(){
      message.rectangles[1].y.should.equal(5);
    });
    it('should have 2 for width', function(){
      message.rectangles[1].width.should.equal(2);
    });
    it('should have 2 for height', function(){
      message.rectangles[1].height.should.equal(2);
    });
    it('should have 0 for encoding', function(){
      message.rectangles[1].encoding.should.equal(0);
    });
    it('should have raw encoding data', function(){
      message.rectangles[1].data.should.be.instanceOf(vncClient.RawEncoding);
    });
  });
});
