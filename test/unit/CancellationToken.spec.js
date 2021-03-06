var describe = require('mocha').describe;
var it = require('mocha').it;
var os = require('os');
var ts = require('typescript');
var beforeEach = require('mocha').beforeEach;
var afterEach = require('mocha').afterEach;
var expect = require('chai').expect;
var mockFs = require('mock-fs');
var CancellationToken = require('../../lib/CancellationToken')
  .CancellationToken;
var FsHelper = require('../../lib/FsHelper').FsHelper;

describe('[UNIT] CancellationToken', function() {
  beforeEach(function() {
    var fsTree = {};
    fsTree[os.tmpdir()] = mockFs.directory();

    mockFs(fsTree);
  });

  afterEach(function() {
    mockFs.restore();
  });

  it('should create valid cancellation token', function() {
    var tokenA = new CancellationToken(require('typescript'));
    expect(tokenA.isCancellationRequested()).to.be.false;

    var tokenB = new CancellationToken(
      require('typescript'),
      'FA#FERgSERgRT$rA$#rA#Ea@RweFRgERG'
    );
    expect(tokenB.isCancellationRequested()).to.be.false;

    var tokenC = new CancellationToken(
      require('typescript'),
      'GFERWgEgeF#R2erwreWrweWER',
      false
    );
    expect(tokenC.isCancellationRequested()).to.be.false;

    var tokenD = new CancellationToken(
      require('typescript'),
      'REGg$#R2$#@r@#R$#T43T$#t43t',
      true
    );
    expect(tokenD.isCancellationRequested()).to.be.true;
  });

  it('should serialize to JSON', function() {
    var tokenA = new CancellationToken(require('typescript'));
    var json = JSON.stringify(tokenA);

    expect(json).to.be.a('string');
    expect(function() {
      JSON.parse(json);
    }).to.not.throw(Error);
    expect(JSON.parse(json)).to.be.a('object');

    var tokenB = CancellationToken.createFromJSON(
      require('typescript'),
      JSON.parse(json)
    );
    expect(tokenA.getCancellationFilePath()).to.be.equal(
      tokenB.getCancellationFilePath()
    );
    expect(tokenA.isCancellationRequested()).to.be.equal(
      tokenB.isCancellationRequested()
    );
  });

  it('should generate path in os.tmpdir() directory', function() {
    var tokenA = new CancellationToken(require('typescript'));

    expect(tokenA.getCancellationFilePath().indexOf(os.tmpdir())).to.be.equal(
      0
    );
  });

  it('should throw ts.OperationCanceledException error on cancelled', function() {
    var tokenA = new CancellationToken(require('typescript'));
    expect(function() {
      tokenA.throwIfCancellationRequested();
    }).to.not.throw();

    var tokenB = new CancellationToken(
      require('typescript'),
      'rgeer#R23r$#T$3t#$t43',
      true
    );
    expect(function() {
      tokenB.throwIfCancellationRequested();
    })
      .to.throw()
      .instanceOf(ts.OperationCanceledException);
  });

  it('should write file in filesystem on requestCancellation', function() {
    var tokenA = new CancellationToken(require('typescript'));
    tokenA.requestCancellation();

    expect(tokenA.isCancellationRequested()).to.be.true;
    expect(FsHelper.existsSync(tokenA.getCancellationFilePath())).to.be.true;
  });

  it('should cleanup file on cleanupCancellation', function() {
    var tokenA = new CancellationToken(require('typescript'));
    tokenA.requestCancellation();
    tokenA.cleanupCancellation();

    expect(tokenA.isCancellationRequested()).to.be.false;
    expect(FsHelper.existsSync(tokenA.getCancellationFilePath())).to.be.false;

    // make sure we can call it as many times as we want to
    expect(function() {
      tokenA.cleanupCancellation();
    }).to.not.throw(Error);
    expect(tokenA.isCancellationRequested()).to.be.false;
  });

  it('should not throw error on cleanupCancellation with no file exists', function() {
    var tokenA = new CancellationToken(
      require('typescript'),
      'some_file_that_doesnt_exists',
      true
    );

    expect(function() {
      tokenA.cleanupCancellation();
    }).to.not.throw();
    expect(function() {
      tokenA.cleanupCancellation();
    }).to.not.throw();
  });

  it('should throttle check for 10ms', function(done) {
    var tokenA = new CancellationToken(require('typescript'));
    var tokenB = CancellationToken.createFromJSON(
      require('typescript'),
      tokenA.toJSON()
    );
    var start = Date.now();

    expect(tokenA.isCancellationRequested()).to.be.false;
    expect(tokenB.isCancellationRequested()).to.be.false;

    tokenA.requestCancellation();
    expect(tokenA.isCancellationRequested()).to.be.true;

    var duration = Math.abs(Date.now() - start);
    if (duration < 10) {
      // we should throttle check
      expect(tokenB.isCancellationRequested()).to.be.false;
    }

    setTimeout(function() {
      expect(tokenB.isCancellationRequested()).to.be.true;
      done();
    }, 11);
  });
});
