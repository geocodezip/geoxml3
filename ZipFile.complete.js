// ZipFile.complete.js
//
// Tue 05/10/2011
//
// =======================================================
//

// JSIO.core.js
//
// core methods for Javascript IO.
//
// by Dino Chiesa
//
// Tue, 19 Jan 2010  17:44
//
// Licensed under the Ms-PL, see
// the accompanying License.txt file
//


(function(){
    if (typeof JSIO == "object"){
        var e1 = new Error("JSIO is already defined");
        e1.source = "JSIO.core.js";
        throw e1;
    }

    JSIO = {};

    JSIO.version = "1.3 2011May10";

    // Format a number as hex.  Quantities over 7ffffff will be displayed properly.
    JSIO.decimalToHexString = function(number, digits) {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }
        var r1 = number.toString(16).toUpperCase();
        if (digits) {
            r1 = "00000000" + r1;
            r1 = r1.substring(r1.length - digits);
        }
        return r1;
    };

    JSIO.FileType = {
        Text    : 0,
        Binary  : 1,
        XML     : 2,
        Unknown : 3
    };


    JSIO.guessFileType = function(name) {
       if (name == "makefile")  { return JSIO.FileType.Text; }

        var lastDot = name.lastIndexOf(".");
        if (lastDot <= 0) { return JSIO.FileType.Unknown; }

        var ext= name.substring(lastDot);
        if (ext == ".zip")   { return JSIO.FileType.Binary; }
        if (ext == ".xlsx")  { return JSIO.FileType.Binary; }
        if (ext == ".docx")  { return JSIO.FileType.Binary; }
        if (ext == ".dll")   { return JSIO.FileType.Binary; }
        if (ext == ".obj")   { return JSIO.FileType.Binary; }
        if (ext == ".pdb")   { return JSIO.FileType.Binary; }
        if (ext == ".exe")   { return JSIO.FileType.Binary; }
        if (ext == ".kmz")   { return JSIO.FileType.Binary; }

        if (ext == ".xml")      { return JSIO.FileType.XML; }
        if (ext == ".xsl")      { return JSIO.FileType.XML; }
        if (ext == ".kml")      { return JSIO.FileType.XML; }
        if (ext == ".csproj")   { return JSIO.FileType.XML; }
        if (ext == ".vbproj")   { return JSIO.FileType.XML; }
        if (ext == ".shfbproj") { return JSIO.FileType.XML; }
        if (ext == ".resx")     { return JSIO.FileType.XML; }
        if (ext == ".xslt")     { return JSIO.FileType.XML; }

        if (ext == ".sln")  { return JSIO.FileType.Text; }
        if (ext == ".htm")  { return JSIO.FileType.Text; }
        if (ext == ".html") { return JSIO.FileType.Text; }
        if (ext == ".js")   { return JSIO.FileType.Text; }
        if (ext == ".vb")   { return JSIO.FileType.Text; }
        if (ext == ".txt")  { return JSIO.FileType.Text; }
        if (ext == ".rels") { return JSIO.FileType.Text; }
        if (ext == ".css")  { return JSIO.FileType.Text; }
        if (ext == ".cs")   { return JSIO.FileType.Text; }

        return JSIO.FileType.Unknown;
    };

    JSIO.stringOfLength = function (charCode, length) {
        var s3 = "";
        for (var i = 0; i < length; i++) {
            s3 += String.fromCharCode(charCode);
        }
        return s3;
    };

    JSIO.formatByteArray = function(b) {
        var s1 = "0000  ";
        var s2 = "";
        for (var i = 0; i < b.length; i++) {
            if (i !== 0 && i % 16 === 0) {
                s1 += "    " + s2 +"\n" + JSIO.decimalToHexString(i, 4) + "  ";
                s2 = "";
            }
            s1 += JSIO.decimalToHexString(b[i], 2) + " ";
            if (b[i] >=32 && b[i] <= 126) {
                s2 += String.fromCharCode(b[i]);
            } else {
                s2 += ".";
            }
        }
        if (s2.length > 0) {
            s1 += JSIO.stringOfLength(32, ((i%16>0)? ((16 - i%16) * 3) : 0) + 4) + s2;
        }
        return s1;
    };


//     JSIO.htmlEscape = function(str) {
//         var div = document.createElement('div');
//         var text = document.createTextNode(str);
//         div.appendChild(text);
//         return div.innerHTML;
//     };

    JSIO.htmlEscape = function(str) {
        return str
            .replace(new RegExp( "&", "g" ), "&amp;")
            .replace(new RegExp( "<", "g" ), "&lt;")
            .replace(new RegExp( ">", "g" ), "&gt;")
            .replace(new RegExp( "\x13", "g" ), "<br/>")
            .replace(new RegExp( "\x10", "g" ), "<br/>");
    };


})();

/// JSIO.core.js ends


// JSIO.BasicByteReaders.js
// ------------------------------------------------------------------
//
// Part of the JSIO library.  Adds a couple basic ByteReaders to JSIO.
// ByteReaders are forward-only byte-wise readers. They read one byte at
// a time from a source.
//
// =======================================================
//
// A ByteReader exposes an interface with these functions:
//
//    readByte()
//       must return null when EOF is reached.
//
//    readToEnd()
//       returns an array of all bytes read, to EOF
//
//    beginReadToEnd(callback)
//       async version of the above
//
//    readBytes(n)
//       returns an array of the next n bytes from the source
//
//    beginReadBytes(n, callback)
//       async version of the above
//
// =======================================================
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
// Last saved: <2011-May-10 17:25:15>
//


(function(){
    var version = "1.3 2011May10";

    if (typeof JSIO !== "object") { JSIO = {}; }
    if ((typeof JSIO.version !== "string")) {
        JSIO.version = version;
    }
    else if ((JSIO.version.length < 3) ||
            (JSIO.version.substring(0,3) !== "1.3")) {
        JSIO.version += " " + version;
    }

    // =======================================================
    // the base object, used as the prototype of all ByteReader objects.
    var _byteReaderBase = function () {
        this.position = 0;
        // position must be incremented in .readByte() for all derived classes
    };

    _byteReaderBase.prototype.readToEnd = function() {
        var accumulator = [];
        var b = this.readByte();
        while (b !== null) {
            accumulator.push(b);
            b = this.readByte();
        }
        return accumulator;
    };

    _byteReaderBase.prototype.beginReadToEnd = function(callback) {
        var bytesRead = [];
        var thisByteReader = this;
        var readBatchAsync = function() {
            var c = 0;
            var b = thisByteReader.readByte();
            while(b !== null) {
                bytesRead.push(b);
                c++;
                if(c >= 1024) { break; }
                b = thisByteReader.readByte();
            }
            if (b!==null){
                if (typeof (setTimeout) == "undefined") {
                    // recurse
                    readBatchAsync();
                }
                else {
                    setTimeout(readBatchAsync, 1);
                }
            }
            else {
                callback(bytesRead);
            }
        };

        // kickoff
        readBatchAsync();
        return null;
    };


    _byteReaderBase.prototype.readBytes = function(n){
        var bytesRead = [];
        for(var i=0; i<n; ++i) {
            bytesRead.push(this.readByte());
        }
        return bytesRead;
    };


    _byteReaderBase.prototype.beginReadBytes = function(n,callback) {
        var bytesRead = [];
        var thisByteReader = this;
        var leftToRead = n;

        var readBatchAsync = function() {
            var c = 0;
            var b = thisByteReader.readByte();
            while(leftToRead > 0 && b !== null) {
                bytesRead.push(b);
                c++;
                leftToRead--;
                if(c >= 1024) { break; }
                b = thisByteReader.readByte();
            }
            if (leftToRead>0 && b !== null){
                setTimeout(readBatchAsync, 1);
            }
            else {
                callback(bytesRead);
            }
        };

        // kickoff
        readBatchAsync();
        return null;
    };

    JSIO._ByteReaderBase = _byteReaderBase;
    // =======================================================




    // =======================================================
    // reads from an array of bytes.
    // This basically wraps a readByte() fn onto array access.
    var _arrayReader = function(array) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.ArrayReader";
            throw error;
        }
        this.position = 0;
        this.array = array;
        this._typename = "JSIO.ArrayReader";
        this._version = version;
        return this;
    };

    _arrayReader.prototype = new JSIO._ByteReaderBase();

    _arrayReader.prototype.readByte = function() {
        if (this.position >= this.array.length) { return null;}  // EOF
        var b = this.array[this.position];
        this.position++;
        return b;
    };

    // =======================================================


    // =======================================================
    // reads one byte at a time from a BinaryUrlStream, until EOF.
    var _streamReader = function(stream) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.StreamReader";
            throw error;
        }

        if (stream) {} else {
            var e2 = new Error("you must pass a non-null stream.");
            e2.source = "JSIO.StreamReader";
            throw e2;
        }

        this.stream = stream;
        this.position = 0;
        this._typeName = "JSIO.StreamReader";
        this._version = version;
        this.length = stream.getLength();
        return this;
    };

    _streamReader.prototype = new JSIO._ByteReaderBase();

    _streamReader.prototype.readByte = function() {
        if (this.position >= this.length) { return null;}  // EOF
        var b = this.stream.readByteAt(this.position);
        this.position++;
        return b;
    };
    // =======================================================



    // =======================================================
    // reads one byte at a time from a defined segment of a stream.
    var _streamSegmentReader = function(stream, offset, length) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.StreamSegmentReader";
            throw error;
        }

        if (stream) {} else {
            var e2 = new Error("you must pass a non-null stream.");
            e2.source = "JSIO.StreamSegmentReader";
            throw e2;
        }

        this.stream = stream;
        this.position = offset || 0;
        this.limit =  (length) ?  offset + length : 0;
        this._typeName =  "JSIO.StreamSegmentReader";
        this._version = version;
        return this;
    };

    _streamSegmentReader.prototype = new JSIO._ByteReaderBase();

    _streamSegmentReader.prototype.readByte = function() {
        if ((this.limit !== 0) && (this.position >= this.limit)) { return null;}  // EOF
        var b = this.stream.readByteAt(this.position);
        this.position++;
        return b;
    };
    // =======================================================

    JSIO.ArrayReader = _arrayReader;
    JSIO.StreamReader = _streamReader;
    JSIO.StreamSegmentReader = _streamSegmentReader;

})();


/// JSIO.BasicByteReaders.js ends

/**
 * JSIO.BinaryUrlStream.js
 *
 * a class that acts as a stream wrapper around binary files obtained from URLs.
 *
 *
 * Derived from work that is
 * Copyright (c) 2008 Andy G.P. Na <nagoon97@naver.com>
 * The source code is freely distributable under the terms of an MIT-style license.
 *
 * You can find out more about the original code at
 * http://nagoon97.com/reading-binary-files-using-ajax/
 */

(function(){
    var version = "1.3 2011May10";
    var typename = "JSIO.BinaryUrlStream";

    if ((typeof JSIO !== "object") ||
        (typeof JSIO.version !== "string") ||
        (JSIO.version.length < 3) ||
        (JSIO.version.substring(0,3) !== "1.3")) {
        var e1 = new Error("This extension requires JSIO.core.js v1.3");
        e1.source = typename + ".js";
        throw e1;
    }

    if (typeof JSIO._ByteReaderBase !== "function") {
        var e2 = new Error("This class requires JSIO.BasicByteReaders.js");
        e2.source = typename + ".js";
        throw e2;
    }

    // internal var
    var Exceptions = {
        FileLoadFailed : 1,
        EOFReached     : 2,
        NoXHR          : 3,
        BadSeek        : 4
    };

    if(/msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
        var IEBinaryToArray_ByteStr_Script =
            "<!-- IEBinaryToArray_ByteStr -->\r\n"+
            "<script type='text/vbscript'>\r\n"+
            "Function IEBinaryToArray_ByteStr(Binary)\r\n"+
            "   IEBinaryToArray_ByteStr = CStr(Binary)\r\n"+
            "End Function\r\n"+
            "Function IEBinaryToArray_ByteStr_Last(Binary)\r\n"+
            "   Dim lastIndex\r\n"+
            "   lastIndex = LenB(Binary)\r\n"+
            "   if lastIndex mod 2 Then\r\n"+
            "           IEBinaryToArray_ByteStr_Last = Chr( AscB( MidB( Binary, lastIndex, 1 ) ) )\r\n"+
            "   Else\r\n"+
            "           IEBinaryToArray_ByteStr_Last = "+'""'+"\r\n"+
            "   End If\r\n"+
            "End Function\r\n"+
            "</script>\r\n";

        // inject VBScript
        document.write(IEBinaryToArray_ByteStr_Script);
    }



    var throwException = function(errorCode, url, msg) {
        var error;
        switch(errorCode){
        case Exceptions.FileLoadFailed:
            error = new Error('Failed to load "'+ url + '"');
            break;

        case Exceptions.EOFReached:
            error = new Error("Error: EOF reached");
            break;

        case Exceptions.NoXHR:
            error = new Error("Error: cannot instantiate XMLHttpRequest");
            break;

        case Exceptions.BadSeek:
            error = new Error("Error: cannot seek");
            break;

        default:
            error = new Error("Unknown Error.");
            break;
        }
        if (msg) {
            error.message = msg;
        }
        error.source = typename;
        throw error;
    };


    var bus = function(url, callback) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.BinaryUrlStream.ctor";
            throw error;
        }

        this.callback = callback;
        this.readByteAt = null;
        this.fileSize = -1;
        this.filePointer = 0;
        this.req = null;
        this._typename = typename;
        this._version = version;

        this.status = "-none-";

        var _IeGetBinResource = function(fileURL){
            var binStream= this;
            // see  http://msdn.microsoft.com/en-us/library/ms535874(VS.85).aspx

            // my helper to convert from responseBody to a "responseText" like thing
            var convertResponseBodyToText = function (binary) {
                var byteMapping = {};
                for ( var i = 0; i < 256; i++ ) {
                    for ( var j = 0; j < 256; j++ ) {
                        byteMapping[ String.fromCharCode( i + j * 256 ) ] =
                            String.fromCharCode(i) + String.fromCharCode(j);
                    }
                }
                var rawBytes = IEBinaryToArray_ByteStr(binary);
                var lastChr = IEBinaryToArray_ByteStr_Last(binary);
                return rawBytes.replace(/[\s\S]/g,
                                        function( match ) { return byteMapping[match]; }) + lastChr;
            };

            this.req = (function() {
                if (window.XMLHttpRequest) {
                    return new window.XMLHttpRequest();
                }
                else {
                    try {
                        return new ActiveXObject("MSXML2.XMLHTTP");
                    }
                    catch(ex) {
                        return null;
                    }
                }
            })();
            this.req.open("GET", fileURL, true);
            this.req.setRequestHeader("Accept-Charset", "x-user-defined");
            this.req.onreadystatechange = function(event){
                if (binStream.req.readyState == 4) {
                    binStream.status = "Status: " + binStream.req.status;
                    //that.httpStatus = that.req.status;
                    if (binStream.req.status == 200) {
                        // this doesn't work...
                        //fileContents = that.req.responseBody.toArray();

                        // this doesn't work... responseBody is not a safeArray
                        //var fileContents = new VBArray(binStream.req.responseBody).toArray();

                        // this works...
                        var fileContents = convertResponseBodyToText(binStream.req.responseBody);
                        binStream.fileSize = fileContents.length-1;
                        if (binStream.fileSize < 0) {throwException(Exceptions.FileLoadFailed, fileURL,"after converting");}
                        binStream.readByteAt = function(i){
                            return fileContents.charCodeAt(i) & 0xff;
                        };
                        if (typeof binStream.callback == "function"){ binStream.callback(binStream);}
                    }
                    else {
                        throwException(Exceptions.FileLoadFailed,fileURL, "http status code " + binStream.req.status);
                    }
                }
            };
            this.req.send();
        };


        var _NormalGetBinResource = function(fileURL){
            var binStream= this;
            this.req = new XMLHttpRequest();
            this.req.open('GET', fileURL, true);
            this.req.onreadystatechange = function(aEvt) {
                if (binStream.req.readyState == 4) {
                    binStream.status = "Status: " + binStream.req.status;
                    if(binStream.req.status == 200){
                        var fileContents = binStream.req.responseText;
                        binStream.fileSize = fileContents.length;

                        binStream.readByteAt = function(i){
                            return fileContents.charCodeAt(i) & 0xff;
                        };
                        if (typeof binStream.callback == "function"){ binStream.callback(binStream);}
                    }
                    else {
                        throwException(Exceptions.FileLoadFailed, fileURL);
                    }
                }
            };
            //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
            this.req.overrideMimeType('text/plain; charset=x-user-defined');
            this.req.send(null);
        };

        if(/msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
            _IeGetBinResource.apply(this, [url]);
        }
        else {
            _NormalGetBinResource.apply(this, [url]);
        }
    };


    JSIO.SeekOrigin = {
        Current   : 1,
        Begin     : 2
    };

    bus.prototype = new JSIO._ByteReaderBase();

    bus.prototype.getLength = function()  {
        return this.fileSize;
    };

    bus.prototype.getPosition = function()  {
        return this.filePointer;
    };


    bus.prototype.seek = function(offset, origin, optionalParent) {

        if (typeof optionalParent != "undefined") {
            if (optionalParent.verbose > 1) {
                optionalParent.status.push("INFO: Seek " + offset + " bytes, origin(" +
                                           origin + ") start(0x" +
                                           JSIO.decimalToHexString(this.filePointer) + "/" +
                                           this.filePointer+")");
            }
        }

        switch (origin) {

        case JSIO.SeekOrigin.Current:
            this.seek(this.filePointer + offset, JSIO.SeekOrigin.Begin);
            break;
        case JSIO.SeekOrigin.Begin:
            if(offset < 0) {this.filePointer = 0;}
            else if(offset > this.getLength()) {
                throwException(Exceptions.EOFReached);
            }
            else {this.filePointer = offset;}
            break;
        default:
            throwException(Exceptions.BadSeek);
            break;
        }

        if (typeof optionalParent != "undefined") {
            if (optionalParent.verbose > 1) {
                optionalParent.status.push("INFO: Seek end(0x" +
                                           JSIO.decimalToHexString(this.filePointer) + "/" +
                                           this.filePointer+")");
            }
        }

        return this.filePointer;
    };

    // n is the number of bytes
    bus.prototype.read = function(n){
        if (n===0) { return [];}
        if (n<0) {
            var error = new Error("invalid read length.");
            error.source= "BinaryUrlStream.read()";
            throw error;
        }
        //n = n || 1;
        var offset = this.filePointer;
        var bytesRead = [];
        for(var i=offset; i<offset+n; i++){
            bytesRead.push(this.readByteAt(i));
        }
        this.filePointer += n;
        return bytesRead;
    };

    // BinaryUrlStream is also a byte reader - provides method readByte()
    bus.prototype.readByte = function(){
        var bytes = this.read(1);
        if (bytes.length == 1) {return bytes[0];}
        return null; // EOF
    };

    // n is the number of bytes
    bus.prototype.beginRead = function(n, callback){
        if (n===0) { callback(0);}
        if (n<0) {
            var error = new Error("invalid read length.");
            error.source= "BinaryUrlStream.beginRead()";
            throw error;
        }
        var bytesRead = [];
        var thisBinStream = this;
        var leftToRead = n;

        var readBatchAsync = function() {
            var c = 0;
            var offset = thisBinStream.filePointer;
            while(leftToRead > 0) {
                bytesRead.push(thisBinStream.readByteAt(c+offset));
                c++;
                leftToRead--;
                // read a 1k batch
                if(c >= 1024) {
                    break;
                }
            }
            thisBinStream.filePointer += c;
            if (leftToRead>0){
                setTimeout(readBatchAsync, 1);
            }
            else {
                callback(bytesRead);
            }
        };

        // kickoff
        readBatchAsync();
        return null;
    };


    bus.prototype.readNumber = function(size, origin){
        var size1 = size || 1;
        var origin1 = origin || this.filePointer;

        var result = 0;
        for(var i=origin1 + size1; i>origin1; i--){
            result = result * 256 + this.readByteAt(i-1);
        }
        this.filePointer = origin1 + size1;
        return result;
    };

    bus.prototype.readString = function(length, origin){
        var length1 = length || 1;
        var origin1 = origin || this.filePointer;
        var result = "";
        var end = origin1 + length1;
        for(var i=origin1; i<end; i++){
            result += String.fromCharCode(this.readByteAt(i));
        }
        this.filePointer+= length1;
        return result;
    };

    bus.prototype.readNullTerminatedString = function(origin){
        var origin1 = origin || this.filePointer;
        var slarge = "";
        var s = "";
        var c = 0;
        var ch = String.fromCharCode(this.readByteAt(origin1+c));
        while(ch !== null) {
            s += ch;
            c++;
            if(c >= 1024) {
                slarge += s;
                s = "";
                origin1 += c;
                this.filePointer += c;
                c = 0;
            }
            ch = String.fromCharCode(this.readByteAt(origin1+c));
        }
        this.filePointer = origin1 + c;
        return slarge + s;
    };


    bus.prototype.beginReadNullTerminatedString = function(callback, origin){
        var origin1 = origin || this.filePointer;
        var slarge = "";
        var s = "";
        var thisBinStream = this;

        var readBatchAsync = function() {
            var c = 0;
            var ch = String.fromCharCode(thisBinStream.readByteAt(origin1+c)) ;
            while(ch !== null) {
                s += ch;c++;
                if(c >= 1024) {
                    slarge += s;
                    s = "";
                    origin1 += c;
                    thisBinStream.filePointer += c;
                    c = 0;
                    break;
                }
                ch = String.fromCharCodet(thisBinStream.readByteAt(i));
            }
            thisBinStream.filePointer = origin1 + c;
            if (ch!==null){
                setTimeout(readBatchAsync, 1);
            }
            else {
                callback(slarge+s);
            }
        };

        // kickoff
        readBatchAsync();
        return null;
    };


    //  This needs to be defined.  I think it would work for UTF-16.
    //  The Unicode name in the function name, can be misleading.
    //
    //     this.readUnicodeString = function(iNumChars, iFrom){
    //         iNumChars = iNumChars || 1;
    //         iFrom = iFrom || filePointer;
    //         this.seek(iFrom, SeekOrigin.Begin);
    //         var result = "";
    //         // this won't really work! Unicode is not always encoded as 2 bytes
    //         var tmpTo = iFrom + iNumChars*2;
    //         for(var i=iFrom; i<tmpTo; i+=2){
    //             result += String.fromCharCode(this.readNumber(2));
    //         }
    //         filePointer+= iNumChars*2;
    //         return result;
    //     };

    JSIO.BinaryUrlStream = bus;

})();

/// JSIO.BinaryUrlStream.js ends
// JSIO.TextDecoder.js
// ------------------------------------------------------------------
//
// Part of the JSIO library.  Adds text decoders, for UTF-8 and UTF-16,
// and plain text.
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
//
// Credits:
//
// Derived in part from work by notmasteryet.
//   http://www.codeproject.com/KB/scripting/Javascript_binaryenc.aspx
//
//
// Wed Apr 07 22:52:13 2010
//

/*
Copyright (c) 2008 notmasteryet

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/



(function(){
    var version = "1.3 2011May10";
    var typename = "JSIO.TextDecoder";

    if ((typeof JSIO !== "object") ||
        (typeof JSIO.version !== "string")) {
        var e1 = new Error("This extension requires JSIO.core.js v1.3");
        e1.source = typename + ".js";
        throw e1;
    }

    if ((JSIO.version.length < 3) ||
        (JSIO.version.substring(0,3) !== "1.3")) {
        var e1a = new Error("This extension requires JSIO.core.js v1.3");
        e1a.source = typename + ".js";
        throw e1a;
    }

    if (typeof JSIO._ByteReaderBase !== "function") {
        var e2 = new Error("This class requires JSIO.BasicByteReaders.js");
        e2.source = typename + ".js";
        throw e2;
    }

    var _dd = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.TextDecoder.Default.ctor";
            throw error;
        }
        this.byteReader = reader;
        this._version = version;
        this._typename = typename + ".Default";
        return this;
    };

    _dd.prototype.readChar = function() {
        var code = this.byteReader.readByte();
        return (code < 0) ? null : String.fromCharCode(code); // ascii?
    };


    var _utf16 = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.TextDecoder.Utf16.ctor";
            throw error;
        }
        this.byteReader = reader;
        this.bomState = 0;
        this._version = version;
        this._typename = typename + ".Utf16";
        return this;
    };

    _utf16.prototype.readChar = function() {
        var b1 = this.byteReader.readByte();
        if(b1 < 0) {return null;}
        var b2 = this.byteReader.readByte();
        if(b2 < 0) {
            var e1 = new Error("Incomplete UTF16 character");
            e1.source = "JSIO.TextDecoder.Utf16.readChar()";
            throw e1;
        }

        if((this.bomState === 0) && ((b1 + b2) == 509)) {
            this.bomState = (b2 == 254) ? 1 : 2;

            b1 = this.byteReader.readByte();
            if(b1 < 0) {return null;}
            b2 = this.byteReader.readByte();
            if(b2 < 0) {
                var e2 = new Error("Incomplete UTF16 character");
                e2.source = "JSIO.TextDecoder.Utf16.readChar()";
                throw e2;
            }
        }
        else {
            this.bomState = 1;
        }
        var code = this.bomState == 1 ? (b2 << 8 | b1) : (b1 << 8 | b2);
        return String.fromCharCode(code);
    };


    /* RFC 3629 */
    var _utf8 = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.TextDecoder.Utf8.ctor";
            throw error;
        }
        this.byteReader = reader;
        this.waitBom = true;
        this.strict = false;
        this.pendingChar = null;
        this._version = version;
        this._typename = typename + ".Utf8";
        return this;
    };


    _utf8.prototype.readChar = function() {
        var ch = null;
        do {
            if(this.pendingChar !== null) {
                ch = this.pendingChar;
                this.pendingChar = null;
            }
            else {
                var b1 = this.byteReader.readByte();
                if(b1 === null) {return null;}

                if((b1 & 0x80) === 0) {
                    ch = String.fromCharCode(b1);
                }
                else {
                    var currentPrefix = 0xC0;
                    var validBits = 5;
                    do {
                        var mask = currentPrefix >> 1 | 0x80;
                        if((b1 & mask) == currentPrefix) {break;}
                        currentPrefix = currentPrefix >> 1 | 0x80;
                        --validBits;
                    } while(validBits >= 0);

                    if(validBits > 0) {
                        var code = (b1 & ((1 << validBits) - 1));
                        for(var i=5;i>=validBits;--i) {
                            var bi = this.byteReader.readByte();
                            if((bi & 0xC0) != 0x80) {
                                var e1 = new Error("Invalid sequence character");
                                e1.source = this._typename + ".readChar";
                                throw e1;
                            }
                            code = (code << 6) | (bi & 0x3F);
                        }
                        if(code <= 0xFFFF) {
                            if(code == 0xFEFF && this.waitBom) {ch = null;}
                            else{ ch = String.fromCharCode(code); }
                        }
                        else {
                            var v = code - 0x10000;
                            var w1 = 0xD800 | ((v >> 10) & 0x3FF);
                            var w2 = 0xDC00 | (v & 0x3FF);
                            this.pendingChar = String.fromCharCode(w2);
                            ch = String.fromCharCode(w1);
                        }
                    }
                    else {
                        // a byte higher than 0x80.
                        if (this.strict) {
                            var e2 = new Error("Invalid character");
                            e2.source = this._typename + ".readChar";
                            throw e2;
                        }
                        else {
                            // fall back to ""super ascii" (eg IBM-437)
                            ch = String.fromCharCode(b1);
                        }
                    }
                }
            }
            this.waitBom = false;
        } while(ch === null);
        return ch;
    };

    JSIO.TextDecoder = {
        Default : _dd,
        Utf16   : _utf16,
        Utf8    : _utf8
    };

})();


/// JSIO.TextDecoder.js ends

// JSIO.TextReader.js
//
// A reader class that decodes text as it reads.
//
// Methods:
//    readChar()         = read 1 char
//    read(n)            = read n chars
//    readLine()         = read one line of data (to \n)
//    unreadChar(ch)     = unread one char
//    readToEnd()        = read all data in the reader;
//                         return a string.
//    beginReadToEnd(cb) = asynchronously read all data.
//
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
//
// Credits:
//
// Derived in part from work by notmasteryet.
//   http://www.codeproject.com/KB/scripting/Javascript_binaryenc.aspx
//
// Last saved: <2011-May-10 17:23:13>
//

/*
Copyright (c) 2008 notmasteryet

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/



(function(){
    var version = "1.3 2011May10";
    var typename = "JSIO.TextReader";

    if (typeof JSIO.TextDecoder.Utf8 !== "function") {
        var e2 = new Error("This class requires JSIO.TextDecoder.js");
        e2.source = typename + ".js";
        throw e2;
    }

    var tr =  function(textDecoder) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = typename + ".ctor";
            throw error;
        }
        this.decoder = textDecoder;
        this._version = version;
        this._typename = typename;
        this.unreads = [];
    };

    // read one char
    tr.prototype.readChar = function() {
        if(this.unreads.length > 0){
            return this.unreads.pop();
        }
        else {
            return this.decoder.readChar();
        }
    };

    // read a length of data
    tr.prototype.read = function(n) {
        var s = "";
        for (vari=0; i<n; i++) {
            var ch = this.readChar();
            if (ch !== null) { s+= ch;}
            else {i=n;}
        }
        return s;
    };

    tr.prototype.unreadChar = function(ch) {
        this.unreads.push(ch);
    };

    tr.prototype.readToEnd = function() {
        var slarge = "";
        var s = "";
        var c = 0;
        var ch = this.readChar();
        while(ch !== null) {
            s += ch;
            c++;
            if(c >= 1024) {
                slarge += s;
                s = "";
                c = 0;
            }
            ch = this.readChar();
        }
        return slarge + s;
    };

    //_state : null,

    tr.prototype.beginReadToEnd = function(callback) {
        //_state = "";
        var slarge = "";
        var s = "";
        var txtrdr = this;

        var readBatchAsync = function() {
            var c = 0;
            var ch = txtrdr.readChar();
            while(ch !== null) {
                s += ch;c++;
                if(c >= 1024) {
                    slarge += s;
                    s = "";
                    break;
                }
                ch = txtrdr.readChar();
            }
            if (ch!==null){
                setTimeout(readBatchAsync, 1);
            }
            else {
                callback(slarge+s);
            }
        };

        // kickoff
        readBatchAsync();
        return null;
    };

    tr.prototype.readLine = function() {
        var s = "";
        var ch = this.readChar();
        if(ch === null) {return null;}

        while(ch != "\r" && ch != "\n") {
            s += ch;
            ch = this.readChar();
            if(ch === null) {return s;}
        }
        if(ch == "\r") {
            ch = this.readChar();
            if(ch !== null && ch != "\n"){
                this.unreadChar(ch);
            }
        }
        return s;
    };

    JSIO.TextReader = tr;

})();


/// JSIO.TextReader.js ends

// JSIO.Crc32.js
//
// Part of the JSIO library.  This adds an CRC32-calculating
// ByteReader to JSIO.
//
// =======================================================
//
// A ByteReader exposes an interface with these functions:
//
//    readByte()
//       must return null when EOF is reached.
//
//    readToEnd()
//       returns an array of all bytes read, to EOF
//
//    beginReadToEnd(callback)
//       async version of the above
//
//    readBytes(n)
//       returns an array of all n bytes read from the source
//
//    beginReadBytes(n, callback)
//       async version of the above
//
// =======================================================
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
// Last saved: <2011-May-10 17:26:46>
//

(function(){
    var version = "1.3 2011May10";
    var typename = "JSIO.Crc32";

    if (typeof JSIO._ByteReaderBase !== "function") {
        var e2 = new Error("This extension requires JSIO.BasicByteReaders.js");
        e2.source = typename + ".js";
        throw e2;
    }

    JSIO.crc32Table = null;
    JSIO.crc32Polynomial = 0xEDB88320;

    var crc32TableCalc = function () {
        // do this once only, for all instances
        if(JSIO.crc32Table) {return;}
        JSIO.crc32Table = new Array(256);
        for(var i=0;i<256;i++) {
            var c=i;
            for(var k=0;k<8;k++) {
                if (c&1 == 1)  {
                    c = JSIO.crc32Polynomial ^ (c>>>1);
                } else {
                    c>>>=1;
                }
            }
            JSIO.crc32Table[i] = c;
        }
    };

    JSIO.computeCrc32 = function(str) {
        crc32TableCalc(); // once
        var c = 0xFFFFFFFF;
        var sL = str.length;
        if (typeof str == "object") {
            for(var n1=0;n1<sL;n1++) {
                c = JSIO.crc32Table[(c&0xff) ^ str[n1]] ^ (c>>>8);
            }
        } else {
            for(var n2=0;n2<sL;n2++) {
                c = JSIO.crc32Table[(c&0xff) ^ str.charCodeAt(n2)] ^ (c>>>8);
            }
        }
        c ^= 0xFFFFFFFF;
        if (c < 0) {c+= 0xFFFFFFFF+1;}
        return c;
    };

    // =======================================================
    var _crc32 = function() {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = typename + ".ctor";
            throw error;
        }
        crc32TableCalc(); // once
        this._typename = typename;
        this._version = version;
        this._runningCrc32 = 0xFFFFFFFF;
    };

    _crc32.prototype.slurpByte = function(b) {
        var r = this._runningCrc32;
        this._runningCrc32 = (r>>>8) ^ JSIO.crc32Table[b ^ (r & 0x000000FF)];
    };

    _crc32.prototype.result = function() {
        var c = this._runningCrc32 ^ 0xFFFFFFFF;
        if (c < 0) {c+= 0xFFFFFFFF+1;}
        return c;
    };
    // =======================================================



    var _crc32CalculatingReader = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.Crc32Reader.ctor";
            throw error;
        }
        this._byteReader = reader;
        this._typename = "JSIO.Crc32Reader";
        this._version = version;
        this._crc32 = new JSIO.Crc32();
    };

    _crc32CalculatingReader.prototype = new JSIO._ByteReaderBase();

    _crc32CalculatingReader.prototype.readByte = function() {
        var b = this._byteReader.readByte();
        if (b !== null) {
            this._crc32.slurpByte(b);
        }
        return b;
    };

    _crc32CalculatingReader.prototype.crc32 = function() {
        return this._crc32.result();
    };

    JSIO.Crc32 = _crc32;
    JSIO.Crc32Reader = _crc32CalculatingReader;

})();

/// JSIO.CRC32.js ends
// JSIO.InflatingReader.js
// ------------------------------------------------------------------
//
// Part of the JSIO library.  This adds an Inflating ByteReader to
// JSIO.
//
// =======================================================
//
// A ByteReader exposes an interface with these functions:
//
//    readByte()
//       must return null when EOF is reached.
//
//    readToEnd()
//       returns an array of all bytes read, to EOF
//
//    beginReadToEnd(callback)
//       async version of the above
//
//    readBytes(n)
//       returns an array of all n bytes read from the source
//
//    beginReadBytes(n, callback)
//       async version of the above
//
// =======================================================
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
// Last saved: <2011-May-10 17:32:07>
//


/*
the inflate logic is
Copyright (c) 2008 notmasteryet

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/



(function(){
    var version = "1.3 2011May10";
    var typename = "JSIO.InflatingReader";

    if (typeof JSIO._ByteReaderBase !== "function") {
        var e2 = new Error("This class requires JSIO.BasicByteReaders.js");
        e2.source = typename + ".js";
        throw e2;
    }

    // =======================================================
    //  _InternalBitReader is used internally in the InflatingReader class.
    //
    var _InternalBitReader = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "InflatingReader._InternalBitReader.ctor";
            throw error;
        }
        this.bitsLength = 0;
        this.bits = 0;
        this.byteReader = reader;
        this._typeName = typename + "._InternalBitReader";
        this._version = version;
    };

    _InternalBitReader.prototype.readBit = function() {
        if(this.bitsLength === 0) {
            var nextByte = this.byteReader.readByte();
            if(nextByte === null) {
                var error = new Error("Unexpected end of stream");
                error.source = this._typeName + ".readBit";
                throw error;
            }
            this.bits = nextByte;
            this.bitsLength = 8;
        }

        var bit = (this.bits & 1) !== 0;
        this.bits >>= 1;
        --this.bitsLength;
        return bit;
    };

    _InternalBitReader.prototype.align = function() { this.bitsLength = 0; };

    _InternalBitReader.prototype.readLSB = function(length) {
        var data = 0;
        for(var i=0;i<length;++i) {
            if(this.readBit()) {data |= 1 << i;}
        }
        return data;
    };

    _InternalBitReader.prototype.readMSB = function(length) {
        var data = 0;
        for(var i=0;i<length;++i) {
            if(this.readBit()) {data = (data << 1) | 1; } else {data <<= 1;}
        }
        return data;
    };
    //
    // =======================================================


    /* inflating ByteReader - RFC 1951 */
    var _inflatingReader = function(reader) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "JSIO.InflatingReader.ctor";
            throw error;
        }
        this._byteReader = reader;
        this._bitReader = new _InternalBitReader(reader);
        this._buffer = [];
        this._bufferPosition = 0;
        this._state = 0;
        this._blockFinal = false;
        this._typeName = typename;
        this._version = version;
        return this;
    };


    // shared fns and variables

    var staticCodes = null;
    var staticDistances = null;

    var clenMap = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    var buildCodes = function(lengths){
        var i=0;
        var codes = new Array(lengths.length);
        var maxBits = lengths[0];
        for (i=1; i<lengths.length; i++) {
            if (maxBits < lengths[i]) {maxBits = lengths[i];}
        }

        var bitLengthsCount = new Array(maxBits + 1);
        for (i=0; i<=maxBits; i++) {bitLengthsCount[i]=0;}

        for (i=0; i<lengths.length; i++) {
            ++bitLengthsCount[lengths[i]];
        }

        var nextCode = new Array(maxBits + 1);
        var code = 0;
        bitLengthsCount[0] = 0;
        for (var bits=1; bits<=maxBits; bits++) {
            code = (code + bitLengthsCount[bits - 1]) << 1;
            nextCode[bits] = code;
        }

        for (i=0; i<codes.length; i++) {
            var len = lengths[i];
            if (len !== 0) {
                codes[i] = nextCode[len];
                nextCode[len]++;
            }
        }
        return codes;
    };

    var buildTree = function(codes, lengths){
        var nonEmptyCodes = [];
        for(var i=0; i<codes.length; ++i) {
            if(lengths[i] > 0) {
                var code = {};
                code.bits = codes[i];
                code.length = lengths[i];
                code.index = i;
                nonEmptyCodes.push(code);
            }
        }
        return buildTreeBranch(nonEmptyCodes, 0, 0);
    };


    var buildTreeBranch = function(codes, prefix, prefixLength){
        if(codes.length === 0) {return null;}

        var zeros = [];
        var ones = [];
        var branch = {};
        branch.isLeaf = false;
        for(var i=0; i<codes.length; ++i) {
            if(codes[i].length == prefixLength && codes[i].bits == prefix) {
                branch.isLeaf = true;
                branch.index = codes[i].index;
                break;
            } else {
                var nextBit = ((codes[i].bits >> (codes[i].length - prefixLength - 1)) & 1) > 0;
                if(nextBit) {
                    ones.push(codes[i]);
                } else {
                    zeros.push(codes[i]);
                }
            }
        }
        if(!branch.isLeaf) {
            branch.zero = buildTreeBranch(zeros, (prefix << 1), prefixLength + 1);
            branch.one = buildTreeBranch(ones, (prefix << 1) | 1, prefixLength + 1);
        }
        return branch;
    };


    var encodedLengthStart = [3,4,5,6,7,8,9,10,
                              11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,
                              115,131,163,195,227,258];

    var encodedLengthAdditionalBits = [0,0,0,0,0,0,0,0,
                                       1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

    var encodedDistanceStart = [1,2,3,4, 5,7,9, 13,17,25, 33,49,65,
                                97,129,193,257,385,513,769,1025,1537,2049,
                                3073,4097,6145,8193,12289,16385,24577];

    var encodedDistanceAdditionalBits = [0,0,0,0,1,1,2,2,3,3,4,4,
                                         5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];


    var readDynamicTrees = function(bitReader){
        var hlit = bitReader.readLSB(5) + 257;
        var hdist = bitReader.readLSB(5) + 1;
        var hclen = bitReader.readLSB(4) + 4;
        var clen = new Array(19);
        var i=0;
        for(i=0; i<clen.length; ++i) {clen[i] = 0;}
        for(i=0; i<hclen; ++i) {clen[clenMap[i]] = bitReader.readLSB(3);}

        var clenCodes = buildCodes(clen);
        var clenTree = buildTree(clenCodes, clen);

        var lengthsSequence = [];
        while(lengthsSequence.length < hlit + hdist) {
            var p = clenTree;
            while(!p.isLeaf) {
                p = bitReader.readBit() ? p.one : p.zero;
            }

            var code = p.index;
            if(code <= 15){ lengthsSequence.push(code);}
            else if(code == 16) {
                var repeat = bitReader.readLSB(2) + 3;
                for(var q=0; q<repeat; ++q){
                    lengthsSequence.push(lengthsSequence[lengthsSequence.length - 1]);
                }
            } else if(code == 17) {
                var repeat1 = bitReader.readLSB(3) + 3;
                for(var q1=0; q1<repeat1; ++q1) {
                    lengthsSequence.push(0);
                }
            } else if(code == 18) {
                var repeat2 = bitReader.readLSB(7) + 11;
                for(var q2=0; q2<repeat2; ++q2){
                    lengthsSequence.push(0);
                }
            }
        }

        var codesLengths = lengthsSequence.slice(0, hlit);
        var codes = buildCodes(codesLengths);
        var distancesLengths = lengthsSequence.slice(hlit, hlit + hdist);
        var distances = buildCodes(distancesLengths);

        return {
            codesTree : buildTree(codes, codesLengths),
            distancesTree : buildTree(distances, distancesLengths)
        };
    };


    _inflatingReader.prototype = new JSIO._ByteReaderBase();


    // internal instance fns
    _inflatingReader.prototype._decodeItem = function() {
        if(this._state == 2) {return null;}

        var item;
        if(this._state === 0) {
            this._blockFinal = this._bitReader.readBit();
            var blockType = this._bitReader.readLSB(2);
            switch(blockType) {
            case 0:
                this._bitReader.align();
                var len = this._bitReader.readLSB(16);
                var nlen = this._bitReader.readLSB(16);
                if((len & ~nlen) != len) {
                    var error = new Error("Invalid block type 0 length");
                    error.source = "JSIO.InflatingReader._decodeItem";
                    throw error;
                }

                item = {};
                item.itemType = 0;
                item.array = new Array(len);
                for(var i=0;i<len;++i) {
                    var nextByte = this._byteReader.readByte();
                    if(nextByte < 0) {
                        var e2 = new Error("Incomplete block");
                        e2.source = "JSIO.InflatingReader._decodeItem";
                        throw e2;
                    }

                    item.array[i] = nextByte;
                }
                if(this._blockFinal) {this._state = 2;}
                return item;
            case 1:
                this._codesTree = staticCodes;
                this._distancesTree = staticDistances;
                this._state = 1;
                break;
            case 2:
                var dTrees = readDynamicTrees(this._bitReader);
                this._codesTree = dTrees.codesTree;
                this._distancesTree = dTrees.distancesTree;
                this._state = 1;
                break;
            default:
                var e3 = new Error("Invalid block type ("+ blockType +")");
                e3.source = "JSIO.InflatingReader._decodeItem";
                throw e3;
            }
        }

        item = {};

        var p = this._codesTree;
        while(!p.isLeaf) {
            p = this._bitReader.readBit() ? p.one : p.zero;
        }
        if(p.index < 256) {
            item.itemType = 2;
            item.symbol = p.index;
        } else if(p.index > 256) {
            var lengthCode = p.index;
            if(lengthCode > 285) {
                var e4 = new Error("Invalid length code");
                e4.source = "JSIO.InflatingReader._decodeItem";
                throw e4;
            }

            var length = encodedLengthStart[lengthCode - 257];
            if(encodedLengthAdditionalBits[lengthCode - 257] > 0) {
                length += this._bitReader.readLSB(encodedLengthAdditionalBits[lengthCode - 257]);
            }

            p = this._distancesTree;
            while(!p.isLeaf) {
                p = this._bitReader.readBit() ? p.one : p.zero;
            }

            var distanceCode = p.index;
            var distance = encodedDistanceStart[distanceCode];
            if(encodedDistanceAdditionalBits[distanceCode] > 0) {
                distance += this._bitReader.readLSB(encodedDistanceAdditionalBits[distanceCode]);
            }

            item.itemType = 3;
            item.distance = distance;
            item.length = length;
        } else {
            item.itemType = 1;
            this._state = this._blockFinal ? 2 : 0;
        }
        return item;
    };



    // public instance functions

    _inflatingReader.prototype.readByte = function() {
        while(this._bufferPosition >= this._buffer.length) {
            var item = this._decodeItem();
            if (item === null) {return null;}
            switch(item.itemType) {
            case 0:
                this._buffer = this._buffer.concat(item.array);
                break;
            case 2:
                this._buffer.push(item.symbol);
                break;
            case 3:
                var j = this._buffer.length - item.distance;
                for(var i=0;i<item.length;i++) {
                    this._buffer.push(this._buffer[j++]);
                }
                break;
            }
        }
        var symbol = this._buffer[this._bufferPosition++];
        if (this._bufferPosition > 0xC000)
        {
            var shift = this._buffer.length - 0x8000;
            if(shift > this._bufferPosition) {shift = this._bufferPosition;}
            this._buffer.splice(0, shift);
            this._bufferPosition -= shift;
        }
        this.position++;
        return symbol;
    };


    // initialization routine - once per type
    (function(){

        var codes = new Array(288);
        var codesLengths = new Array(288);
        var i=0;
        for (i = 0; i <= 143; i++) {
            codes[i] = 0x0030 + i;
            codesLengths[i] = 8;
        }
        for ( i = 144; i <= 255; i++) {
            codes[i] = 0x0190 + i - 144;
            codesLengths[i] = 9;
        }
        for ( i = 256; i <= 279; i++) {
            codes[i] = 0x0000 + i - 256;
            codesLengths[i] = 7;
        }
        for ( i = 280; i <= 287; i++) {
            codes[i] = 0x00C0 + i - 280;
            codesLengths[i] = 8;
        }
        staticCodes = buildTree(codes, codesLengths);

        var distances = new Array(32);
        var distancesLengths = new Array(32);
        for ( i = 0; i <= 31; i++) {
            distances[i] = i;
            distancesLengths[i] = 5;
        }
        staticDistances = buildTree(distances, distancesLengths);
    })();


    JSIO.InflatingReader = _inflatingReader;

})();


/// JSIO.InflatingReader.js ends

// Zipfile.js
//
// A class that reads Zip files.
// Depends on the JSIO library functions.
//
//
// Copyright (c) 2010, Dino Chiesa
//
// This work is licensed under the MS-PL.  See the attached
// License.txt file for details.
//
//
// Last saved: <2011-May-10 17:34:52>
//

(function(){
    var version = "1.26 2011Aug07";

    if (typeof JSIO.BinaryUrlStream != "function") {
        var e1 = new Error("This extension requires JSIO.BinaryUrlStream.js v1.3");
        e1.source = "Zipfile.js";
        throw e1;
    }

    if (typeof JSIO.TextDecoder !== "object"){
        var e2 = new Error("This extension requires JSIO.TextDecoder.js");
        e2.source = "Zipfile.js";
        throw e2;
    }

    if (typeof JSIO.TextReader !== "function"){
        var e3 = new Error("This extension requires JSIO.TextReader.js");
        e3.source = "Zipfile.js";
        throw e3;
    }

    if (typeof JSIO.Crc32 !== "function"){
        var e4 = new Error("This extension requires JSIO.Crc32.js");
        e4.source = "Zipfile.js";
        throw e4;
    }

    if (typeof JSIO.InflatingReader !== "function"){
        var e5 = new Error("This extension requires JSIO.InflatingReader.js");
        e5.source = "Zipfile.js";
        throw e5;
    }


    // =======================================================
    function ZipEntry(zip) {
        this.zipfile = zip;
        this._typename = "ZipEntry";
        this._version = version;
        this._crcCalculator = null;
    }


    // return byte array or string
    ZipEntry.prototype.extract = function(callback, asString) {
        this.contentType = JSIO.guessFileType(this.name);
        asString = asString || ( this.contentType == JSIO.FileType.Text ||
                                 this.contentType == JSIO.FileType.XML);
        var thisEntry = this;

        if (this.compressionMethod !== 0 && this.compressionMethod != 8) {
            var error = new Error("Unsupported compression method: " + this.compressionMethod);
            error.source=  "ZipEntry.extract()";
            throw error;
        }

        var reader = (asString) ? this.openTextReader() : this.openBinaryReader();

        // diagnostic purpose only; tag the reader with the entry name
        reader.zipEntryName = thisEntry.name;

        if (typeof callback != "function") {
            // synchronous
            var result = reader.readToEnd();
            this.verifyCrc32();
            return result;
        }

        // asynchronous
        reader.beginReadToEnd(function(result){
            // try {
                thisEntry.verifyCrc32();
                callback(thisEntry, result);
            /* }
            catch (exc1) {
                callback(thisEntry, exc1);
            } */
        });
        return null;
    };


    // open a ByteReader on the entry, which will read binary
    // content from the compressed stream.
    ZipEntry.prototype.openBinaryReader = function() {
        var reader =
                new JSIO.StreamSegmentReader(this.zipfile.binaryStream,
                                             this.offset + this.lengthOfHeader,
                                             this.compressedSize);
        if (this.compressionMethod === 0) {
            this._crcCalculator = new JSIO.Crc32Reader(reader);
        }
        else {
            var inflator = new JSIO.InflatingReader(reader);
            this._crcCalculator = new JSIO.Crc32Reader(inflator);
        }
        // Whether compressed or not, the source ByteReader in each case
        // is wrapped in a second ByteReader object that calculates CRC
        // as it reads.  That way, after all reading is complete, the
        // caller can check the calcuated CRC against the expected CRC.
        return this._crcCalculator;
    };

    // open a TextReader on the entry, to read text from the
    // compressed stream.
    ZipEntry.prototype.openTextReader = function(decoderKind) {
        var reader = this.openBinaryReader();
        decoderKind = decoderKind || JSIO.TextDecoder.Utf8;
        var d = new decoderKind();
        decoderKind.apply(d, [reader]);
        var textReader = new JSIO.TextReader(d);
        d._parent = textReader;// store a reference, for diagnostic purposes only
        return textReader;
    };

    // verify the CRC on the entry.
    // call this after all bytes have been read.
    ZipEntry.prototype.verifyCrc32 = function() {
        var computedCrc = this._crcCalculator.crc32();
        var rc = false;  // CRC FAIL
        if (this.crc32 != computedCrc) {
            var msg = "WARNING: CRC check failed: " +
                "entry(" + this.name + ") " +
                "computed(" + JSIO.decimalToHexString(computedCrc,8) + ") " +
                "expected(" + JSIO.decimalToHexString(this.crc32,8) + ") ";
            this.zipfile.status.push(msg);
        } else {
            rc = true;  // OK
            if (this.zipfile.verbose>2) {
                this.zipfile.status.push("INFO: CRC check ok: 0x" +
                                         JSIO.decimalToHexString(this.crc32,8));
            }
        }
        return rc;
    };


    // ctor
    ZipFile = function(fileUrl, callback, verbosity) {
        if (! (this instanceof arguments.callee) ) {
            var error = new Error("you must use new to instantiate this class");
            error.source = "ZipFile.ctor";
            throw error;
        }

        this.verbose = verbosity || 0;
        this.entries = [];
        this.entryNames = [];
        this.status = [];
        this._version = version;
        this._typename = "ZipFile";

        var thisZipFile = this;

        // Could use a back-tracking reader for the central directory, but
        // there's no point, since all the zip data is held in memory anyway.
        //
        //     function ReadCentralDirectory(){
        //         var posn = thisZipFile.binaryStream.getLength - 64;
        //         var maxSeekback = Math.Max(s.Length - 0x4000, 10);
        //         var success = false;
        //         var nTries = 0;
        //         do
        //         {
        //             thisZipFile.binaryStream.Seek(posn, SeekOrigin.Begin);
        //             var bytesRead = thisZipFile.binaryStream.findSignature(thisZipFile.Signatures.EndOfCentralDirectory);
        //             if (bytesRead != -1)
        //                 success = true;
        //             else
        //             {
        //                 nTries++;
        //                 // increasingly larger
        //                 posn -= (32 * (nTries + 1) * nTries);
        //                 if (posn < 0) posn = 0;  // BOF
        //             }
        //         }
        //         while (!success && posn > maxSeekback);
        //         if (!success) {
        //             thisZipFile.status.push("cannot find End of Central Directory");
        //             return;
        //         }
        //     }


        function DateFromPackedFormat(packed) {
            if (packed == 0xFFFF || packed === 0) {
                return new Date(1995, 0, 1, 0,0,0,0);
            }

            var packedTime = packed & 0x0000ffff;
            var packedDate = ((packed & 0xffff0000) >> 16);

            var year = 1980 + ((packedDate & 0xFE00) >> 9);
            var month = ((packedDate & 0x01E0) >> 5) -1;
            var day = packedDate & 0x001F;

            var hour = (packedTime & 0xF800) >> 11;
            var minute = (packedTime & 0x07E0) >> 5;
            var second = (packedTime & 0x001F) * 2;

            // Validation and error checking.
            // This is not foolproof but will catch most errors.

            // I can't believe how many different ways applications
            // can mess up a simple date format.

            if (second >= 60) { minute++; second = 0; }
            if (minute >= 60) { hour++; minute = 0; }
            if (hour >= 24) { day++; hour = 0; }
            var success = false;
            var d;
            try {
                d = new Date(year, month, day, hour, minute, second, 0);
                success= true;
            }
            catch (exc1) {
                if (year == 1980 && (month === 0 || day === 0)) {
                    try {
                        d = new Date(1980, 0, 1, hour, minute, second, 0);
                        success= true;
                    }
                    catch (exc2) {
                        try {
                            d = new Date(1980, 0, 1, 0, 0, 0, 0);
                            success= true;
                        }
                        catch (exc3) { }
                    }
                }
                else {
                    try {
                        while (year < 1980) {year++;}
                        while (year > 2030) {year--;}
                        while (month < 1) {month++;}
                        while (month > 12) {month--;}
                        while (day < 1) {day++;}
                        while (day > 28) {day--;}
                        while (minute < 0) {minute++;}
                        while (minute > 59) {minute--;}
                        while (second < 0) {second++;}
                        while (second > 59) {second--;}
                        d = new Date(year, month-1, day, hour, minute, second, 0);
                        success= true;
                    }
                    catch (exc4){}
                }
            }
            if (!success) {
                var error = new Error("bad date/time value in this zip file.");
                error.source= "ZipFile.ReadZipEntry";
                throw error;
            }
            return d;
        }


        function ReadZipEntries () {
            // read only once
            if (thisZipFile.entryNames.length === 0){
                var e;
                while ((e = ReadZipEntry()) !== null) {
                    thisZipFile.entries.push(e);
                    thisZipFile.entryNames.push(e.name);
                }
            }
        }


        function ReadZipEntry () {
            var offset = thisZipFile.binaryStream.getPosition();
            var sig = thisZipFile.binaryStream.readNumber(4);
            if (sig == ZipFile.Signatures.DirEntry) {
                // after all entries, comes the central directory
                if (thisZipFile.verbose > 0) {
                    thisZipFile.status.push("INFO: at offset 0x" +
                                     JSIO.decimalToHexString(offset) +
                                     ", found start of Zip Directory.");
                }
                // all done reading
                return null;
            }
            if (sig != ZipFile.Signatures.Entry) {
                thisZipFile.status.push("WARNING: at offset 0x" +
                                 JSIO.decimalToHexString(offset) +
                                 ", found unexpected signature: 0x" +
                                 JSIO.decimalToHexString(sig));
                return null;
            }

            var entry = new ZipEntry(thisZipFile);
            entry.offset = offset;
            entry.versionNeeded = thisZipFile.binaryStream.readNumber(2);
            entry.bitField = thisZipFile.binaryStream.readNumber(2);
            entry.compressionMethod = thisZipFile.binaryStream.readNumber(2);
            var timeBlob = thisZipFile.binaryStream.readNumber(4);
            entry.lastModified = DateFromPackedFormat(timeBlob);

            if ((entry.bitField & 0x01) == 0x01){
                thisZipFile.status.push("This zipfile uses Encryption, which is not supported by ZipFile.js.");
                return null;
            }

            entry.utf8 = ((entry.bitField & 0x0800) == 0x0800);

            // if ((entry.bitField & 0x0800) == 0x0800){
            //     thisZipFile.status.push("This zipfile uses UTF8, which is not supported by ZipFile.js.");
            //     return null;
            // }

            if ((entry.bitField & 0x0008) == 0x0008){
                thisZipFile.status.push("This zipfile uses a bit 3 trailing data descriptor, which is not supported by ZipFile.js.");
                return null;
            }

            entry.crc32 = thisZipFile.binaryStream.readNumber(4);
            entry.compressedSize = thisZipFile.binaryStream.readNumber(4);
            entry.uncompressedSize = thisZipFile.binaryStream.readNumber(4);

            if (entry.compressedSize == 0xFFFFFFFF ||
                entry.uncompressedSize == 0xFFFFFFFF) {
                thisZipFile.status.push("This zipfile uses ZIP64, which is not supported by ZipFile.js");
                return null;
            }

            var filenameLength = thisZipFile.binaryStream.readNumber(2);
            var extraFieldLength = thisZipFile.binaryStream.readNumber(2);

            thisZipFile.status.push("INFO: filename length= " + filenameLength);

            // we've read 30 bytes of metadata so far
            var bytesRead = 30 + filenameLength + extraFieldLength;

            if (entry.utf8) {
                thisZipFile.status.push("INFO: before filename, position= 0x" +
                                        JSIO.decimalToHexString( thisZipFile.binaryStream.getPosition()));
                var binReader =
                    new JSIO.StreamSegmentReader(thisZipFile.binaryStream,
                                                 thisZipFile.binaryStream.getPosition(),
                                                 filenameLength);
                var utf8Decoder = new JSIO.TextDecoder.Utf8(binReader);
                var textReader = new JSIO.TextReader(utf8Decoder);
                entry.name = textReader.readToEnd();

                // advance the filepointer:
                thisZipFile.binaryStream.seek(filenameLength,
                                              JSIO.SeekOrigin.Current,
                                              thisZipFile);

                thisZipFile.status.push("INFO: after filename, position= 0x" +
                                        JSIO.decimalToHexString( thisZipFile.binaryStream.getPosition()));
            }
            else {
                entry.name = thisZipFile.binaryStream.readString(filenameLength);
            }
            entry.extra = thisZipFile.binaryStream.read(extraFieldLength);

            if (thisZipFile.verbose > 1) {
                thisZipFile.status.push("INFO: at offset 0x" +
                             JSIO.decimalToHexString(entry.offset) +
                             ", found entry '" + entry.name + "' fnl(" +
                             filenameLength + ") efl(" +
                             extraFieldLength +")");
            }

            if (extraFieldLength > 0) {
                if (thisZipFile.verbose > 0) {
                    thisZipFile.status.push("INFO: entry " + entry.name + " has " +
                                     extraFieldLength + " bytes of " +
                                     "extra metadata (ignored)");
                }
            }

            // There are a bunch of things in the "extra" header, thisZipFile we
            // could parse, like timestamps and other things.  This class
            // doesn't parse them.

            entry.lengthOfHeader = bytesRead;
            entry.totalEntrySize = entry.lengthOfHeader + entry.compressedSize;

            // seek past the data without reading it. We will read on Extract()
            if (thisZipFile.verbose > 1) {
                thisZipFile.status.push("INFO: seek 0x" +
                                 JSIO.decimalToHexString(entry.compressedSize) +
                                 " (" + entry.compressedSize + ") bytes");
            }

            thisZipFile.binaryStream.seek(entry.compressedSize,
                              JSIO.SeekOrigin.Current,
                              thisZipFile);

            return entry;
        }


        var parseZipFile = function(bfr){
            try {
                if (bfr.req.status == 200) {
                    var sig = thisZipFile.binaryStream.readNumber(4);
                    if (sig != ZipFile.Signatures.Entry){
                        thisZipFile.status.push("WARNING: this file does not appear to be a zip file");
                    } else {
                        thisZipFile.binaryStream.seek(0, JSIO.SeekOrigin.Begin);
                        ReadZipEntries();
                        if (thisZipFile.verbose > 0) {
                            thisZipFile.status.push("INFO: read " + thisZipFile.entries.length + " entries");
                        }
                    }
                }
                else {
                    thisZipFile.status.push("ERROR: the URL could not be read (" +
                                     bfr.req.status + " " + bfr.req.statusText + ")");
                }
                callback(thisZipFile);
            }
            catch (exc1)
            {
                thisZipFile.status.push("Exception: " + exc1.message);
                callback(thisZipFile);
            }
        };

        this.binaryStream = new JSIO.BinaryUrlStream(fileUrl, parseZipFile);

        return this;
    };


    ZipFile.Signatures = {
        Entry                 : 0x04034b50,
        EndOfCentralDirectory : 0x06054b50,
        DirEntry              : 0x02014b50
    };

    ZipFile.Version = version;

    ZipFile.EncryptionAlgorithm = {
        None      : 0,
        PkzipWeak : 1,
        WinZipAes : 2
    };

})();
