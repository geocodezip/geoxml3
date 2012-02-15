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
/*
    geoxml3.js

    Renders KML on the Google Maps JavaScript API Version 3
    http://code.google.com/p/geoxml3/

   Copyright 2010 Sterling Udell, Larry Ross

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

// Extend the global String object with a method to remove leading and trailing whitespace
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

// Declare namespace
geoXML3 = window.geoXML3 || {instances: []};

// Constructor for the root KML parser object
geoXML3.parser = function (options) {
  // Private variables
  var parserOptions = geoXML3.combineOptions(options, {
    singleInfoWindow: false,
    processStyles: true,
    zoom: true
  });
  var docs        = [];  // Individual KML documents
  var docsByUrl   = [];  // Same docs as an hash by cleanURL
  var kmzMetaData = [];  // Extra files from KMZ data
  var styles      = {};  // Global list of styles
  var lastPlacemark;
  var parserName;
  if (typeof parserOptions.suppressInfoWindows == "undefined") parserOptions.suppressInfoWindows = false;
  if (!parserOptions.infoWindow && parserOptions.singleInfoWindow)
    parserOptions.infoWindow = new google.maps.InfoWindow();

  var parseKmlString = function (kmlString, docSet) {
    // Internal values for the set of documents as a whole
    var internals = {
      parser: this,
      docSet: docSet || [],
      remaining: 1,
      parseOnly: !(parserOptions.afterParse || parserOptions.processStyles)
    };
    thisDoc = new Object();
    thisDoc.internals = internals;
    internals.docSet.push(thisDoc);
    render(geoXML3.xmlParse(kmlString),thisDoc);
  }

  var parse = function (urls, docSet) {
    // Process one or more KML documents
    if (!parserName) {
      parserName = 'geoXML3.instances[' + (geoXML3.instances.push(this) - 1) + ']';
    }

    if (typeof urls === 'string') {
      // Single KML document
      urls = [urls];
    }

    // Internal values for the set of documents as a whole
    var internals = {
      parser: this,
      docSet: docSet || [],
      remaining: urls.length,
      parseOnly: !(parserOptions.afterParse || parserOptions.processStyles)
    };
    var thisDoc, j;
    for (var i = 0; i < urls.length; i++) {
      var baseUrl = cleanURL(defileURL(location.pathname), urls[i]);
      if (docsByUrl[baseUrl]) {
        // Reloading an existing document
        thisDoc = docsByUrl[baseUrl];
        thisDoc.reload = true;
      }
      else {
        thisDoc = new Object();
        thisDoc.baseUrl = baseUrl;
        internals.docSet.push(thisDoc);
      }
      thisDoc.url       = urls[i];
      thisDoc.internals = internals;
      fetchDoc(thisDoc.url, thisDoc);
    }
  };

  function fetchDoc(url, doc, resFunc) {
    resFunc = resFunc || function (responseXML) { render(responseXML, doc); };
  
    if (typeof ZipFile === 'function' && typeof JSIO === 'object' && typeof JSIO.guessFileType === 'function') {  // KMZ support requires these modules loaded
      contentType = JSIO.guessFileType(doc.baseUrl);
      if (contentType == JSIO.FileType.Binary || contentType == JSIO.FileType.Unknown) {
         doc.isCompressed = true;
         doc.baseDir = doc.baseUrl + '/';
         geoXML3.fetchZIP(url, resFunc, doc.internals.parser);
         return;
      }
    }
    doc.isCompressed = false;
    doc.baseDir = defileURL(doc.baseUrl);
    geoXML3.fetchXML(url, resFunc);
  }

  var hideDocument = function (doc) {
    if (!doc) doc = docs[0];
    // Hide the map objects associated with a document
    var i;
    if (!!doc.markers) {
      for (i = 0; i < doc.markers.length; i++) {
        if(!!doc.markers[i].infoWindow) doc.markers[i].infoWindow.close();
        doc.markers[i].setVisible(false);
      }
    }
    if (!!doc.ggroundoverlays) {
      for (i = 0; i < doc.ggroundoverlays.length; i++) {
        doc.ggroundoverlays[i].setOpacity(0);
      }
    }
    if (!!doc.gpolylines) {
      for (i=0;i<doc.gpolylines.length;i++) {
        if(!!doc.gpolylines[i].infoWindow) doc.gpolylines[i].infoWindow.close();
        doc.gpolylines[i].setMap(null);
      }
    }
    if (!!doc.gpolygons) {
      for (i=0;i<doc.gpolygons.length;i++) {
        if(!!doc.gpolygons[i].infoWindow) doc.gpolygons[i].infoWindow.close();
        doc.gpolygons[i].setMap(null);
      }
    }
  };

  var showDocument = function (doc) {
    if (!doc) doc = docs[0];
    // Show the map objects associated with a document
    var i;
    if (!!doc.markers) {
      for (i = 0; i < doc.markers.length; i++) {
        doc.markers[i].setVisible(true);
      }
    }
    if (!!doc.ggroundoverlays) {
      for (i = 0; i < doc.ggroundoverlays.length; i++) {
        doc.ggroundoverlays[i].setOpacity(doc.ggroundoverlays[i].percentOpacity_);
      }
    }
    if (!!doc.gpolylines) {
      for (i=0;i<doc.gpolylines.length;i++) {
        doc.gpolylines[i].setMap(parserOptions.map);
      }
    }
    if (!!doc.gpolygons) {
      for (i=0;i<doc.gpolygons.length;i++) {
        doc.gpolygons[i].setMap(parserOptions.map);
      }
    }
  };

  var defaultStyle = {
    balloon: {
      bgColor:   'ffffffff',
      textColor: 'ff000000',
      text: "<h3>$[name]</h3>\n<div>$[description]</div>\n<div>$[geDirections]</div>",
      displayMode: 'default'
    },
    icon: {
      scale: 1.0,
      dim: {
        x: 0,
        y: 0,
        w: -1,
        h: -1
      },
      hotSpot: {
        x: 0.5,
        y: 0.5,
        xunits: 'fraction',
        yunits: 'fraction'
      }
    },
    line: {
      color: 'ffffffff', // white (KML default)
      colorMode: 'normal',
      width: 1.0
    },
    poly: {
      color: 'ffffffff', // white (KML default)
      colorMode: 'normal',
      fill: true,
      outline: true
    }
  };
  
  var gx = 'http://www.google.com/kml/ext/2.2';

  function processStyle(thisNode, baseUrl, styleID, baseDir) {
    var nodeValue              = geoXML3.nodeValue;
    var getBooleanValue        = geoXML3.getBooleanValue;
    var getElementsByTagNameNS = geoXML3.getElementsByTagNameNS;
    var style = (baseUrl === '{inline}') ? clone(defaultStyle) : (styles[baseUrl][styleID] = styles[baseUrl][styleID] || clone(defaultStyle));
    
    var styleNodes = thisNode.getElementsByTagName('BalloonStyle');
    if (!!styleNodes && styleNodes.length > 0) {
      style.balloon.bgColor     = nodeValue(styleNodes[0].getElementsByTagName('bgColor')[0],     style.balloon.bgColor);
      style.balloon.textColor   = nodeValue(styleNodes[0].getElementsByTagName('textColor')[0],   style.balloon.textColor);
      style.balloon.text        = nodeValue(styleNodes[0].getElementsByTagName('text')[0],        style.balloon.text);
      style.balloon.displayMode = nodeValue(styleNodes[0].getElementsByTagName('displayMode')[0], style.balloon.displayMode);
    }

    // style.list = (unsupported; doesn't make sense in Google Maps)

    var styleNodes = thisNode.getElementsByTagName('IconStyle');
    if (!!styleNodes && styleNodes.length > 0) {
      var icon = style.icon;
    
      icon.scale = parseFloat(nodeValue(styleNodes[0].getElementsByTagName('scale')[0], icon.scale));
      // style.icon.heading   = (unsupported; not supported in API)
      // style.icon.color     = (unsupported; not supported in API)
      // style.icon.colorMode = (unsupported; not supported in API)

      styleNodes = thisNode.getElementsByTagName('Icon');
      if (!!styleNodes && styleNodes.length > 0) {
        icon.href = nodeValue(styleNodes[0].getElementsByTagName('href')[0]);
        icon.url  = cleanURL(baseDir, icon.href);
      }

      // Detect images buried in KMZ files (and use a base64 encoded URL)
      if (kmzMetaData[icon.url]) icon.url = kmzMetaData[icon.url].dataUrl;

      // Support for icon palettes and exact size dimensions
      icon.dim = {
        x: parseInt(nodeValue(getElementsByTagNameNS(styleNodes[0], gx, 'x')[0], icon.dim.x)),
        y: parseInt(nodeValue(getElementsByTagNameNS(styleNodes[0], gx, 'y')[0], icon.dim.y)),
        w: parseInt(nodeValue(getElementsByTagNameNS(styleNodes[0], gx, 'w')[0], icon.dim.w)),
        h: parseInt(nodeValue(getElementsByTagNameNS(styleNodes[0], gx, 'h')[0], icon.dim.h))
      };

      styleNodes = styleNodes[0].getElementsByTagName('hotSpot')[0];
      if (!!styleNodes && styleNodes.length > 0) {
        icon.hotSpot = {
          x:      styleNodes[0].getAttribute('x'),
          y:      styleNodes[0].getAttribute('y'),
          xunits: styleNodes[0].getAttribute('xunits'),
          yunits: styleNodes[0].getAttribute('yunits')
        };
      }
      
      // certain occasions where we need the pixel size of the image (like the default settings...)
      // (NOTE: Scale is applied to entire image, not just the section of the icon palette.  So,
      //  if we need scaling, we'll need the img dimensions no matter what.)
      if ( (icon.dim.w < 0 || icon.dim.h < 0) && (icon.xunits != 'pixels' || icon.yunits == 'fraction') || icon.scale != 1.0) {
        // (hopefully, this will load by the time we need it...)
        icon.img = new Image();
        icon.img.onload = function() {
          if (icon.dim.w < 0 || icon.dim.h < 0) {
            icon.dim.w = this.width;
            icon.dim.h = this.height;
          }
        };
        icon.img.src = icon.url;
        
        // sometimes the file is already cached and it never calls onLoad
        if (icon.img.width > 0) {
          icon.dim.w = icon.img.width;
          icon.dim.h = icon.img.height;
        }
      }
    }
    
    // style.label = (unsupported; may be possible but not with API)
    
    styleNodes = thisNode.getElementsByTagName('LineStyle');
    if (!!styleNodes && styleNodes.length > 0) {
      style.line.color     = nodeValue(styleNodes[0].getElementsByTagName('color')[0],     style.line.color);
      style.line.colorMode = nodeValue(styleNodes[0].getElementsByTagName('colorMode')[0], style.line.colorMode);
      style.line.width     = nodeValue(styleNodes[0].getElementsByTagName('width')[0],     style.line.width);
      // style.line.outerColor      = (unsupported; not supported in API)
      // style.line.outerWidth      = (unsupported; not supported in API)
      // style.line.physicalWidth   = (unsupported; unneccesary in Google Maps)
      // style.line.labelVisibility = (unsupported; possible to implement)
    }
    
    styleNodes = thisNode.getElementsByTagName('PolyStyle');
    if (!!styleNodes && styleNodes.length > 0) {
      style.poly.color     = nodeValue(      styleNodes[0].getElementsByTagName('color')[0],     style.poly.color);
      style.poly.colorMode = nodeValue(      styleNodes[0].getElementsByTagName('colorMode')[0], style.poly.colorMode);
      style.poly.outline   = getBooleanValue(styleNodes[0].getElementsByTagName('outline')[0],   style.poly.outline);
      style.poly.fill      = getBooleanValue(styleNodes[0].getElementsByTagName('fill')[0],      style.poly.fill);
    }
    return style;
  }

  // from http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
  // http://keithdevens.com/weblog/archive/2007/Jun/07/javascript.clone
  function clone(obj){
    if(obj == null || typeof(obj) != 'object') return obj;
    var temp = new obj.constructor();
    for(var key in obj) temp[key] = clone(obj[key]);
    return temp;
  }

  function processStyleMap(thisNode, baseUrl, styleID, baseDir) {
    var nodeValue  = geoXML3.nodeValue;
    var pairs = thisNode.getElementsByTagName('Pair');
    var map = new Object();

    // add each key to the map
    for (var pr=0;pr<pairs.length;pr++) {
      var pairKey      = nodeValue(pairs[pr].getElementsByTagName('key')[0]);
      var pairStyle    = nodeValue(pairs[pr].getElementsByTagName('Style')[0]);
      var pairStyleUrl = nodeValue(pairs[pr].getElementsByTagName('styleUrl')[0]).split('#');
      var pairStyleBaseUrl = pairStyleUrl[0] ? cleanURL(baseDir, pairStyleUrl[0]) : baseUrl;
      var pairStyleID      = pairStyleUrl[1];
      
      if (!!pairStyle) {
        map[pairKey] = processStyle(pairStyle, pairStyleBaseUrl, pairStyleID);
      } else if (!!pairStyleID && !!styles[pairStyleBaseUrl][pairStyleID]) {
        map[pairKey] = clone(styles[pairStyleBaseUrl][pairStyleID]);
      }
    }
    if (!!map["normal"]) {
      styles[baseUrl][styleID] = clone(map["normal"]);
    } else {
      styles[baseUrl][styleID] = clone(defaultStyle);
    }
    if (!!map["highlight"]) {
      processStyleID(map["highlight"]);
    }
    styles[baseUrl][styleID].map = clone(map);
  }

  function processPlacemarkCoords(node, tag) {
    var parent = node.getElementsByTagName(tag);
    var coordListA = [];
    for (var i=0; i<parent.length; i++) {
      var coordNodes = parent[i].getElementsByTagName('coordinates')
      if (!coordNodes) {
        if (coordListA.length > 0) {
          break;
        } else {
          return [{coordinates: []}];
        }
      }

      for (var j=0; j<coordNodes.length;j++) {
        var coords = geoXML3.nodeValue(coordNodes[j]).trim();
        coords = coords.replace(/,\s+/g, ',');
        var path = coords.split(/\s+/g);
        var pathLength = path.length;
        var coordList = [];
        for (var k = 0; k < pathLength; k++) {
          coords = path[k].split(',');
          if (!isNaN(coords[0]) && !isNaN(coords[1])) {
            coordList.push({
              lat: parseFloat(coords[1]),
              lng: parseFloat(coords[0]),
              alt: parseFloat(coords[2])
            });
          }
        }
        coordListA.push({coordinates: coordList});
      }
    }
    return coordListA;
  }

  var render = function (responseXML, doc) {
    // Callback for retrieving a KML document: parse the KML and display it on the map
    if (!responseXML) {
      // Error retrieving the data
      geoXML3.log('Unable to retrieve ' + doc.url);
      if (parserOptions.failedParse) parserOptions.failedParse(doc);
      doc.failed = true;
      return;
    } else if (responseXML.parseError && responseXML.parseError.errorCode != 0) {
      // IE parse error
      var err = responseXML.parseError; 
      var msg = 'Parse error in line ' + err.line + ', col ' + err.linePos + ' (error code: ' + err.errorCode + ")\n" +
        "\nError Reason: " + err.reason +
        'Error Line: ' + err.srcText;
      
      geoXML3.log('Unable to retrieve ' + doc.url + ': ' + msg);
      if (parserOptions.failedParse) parserOptions.failedParse(doc);          
      doc.failed = true;
      return;
    } else if (responseXML.documentElement && responseXML.documentElement.nodeName == 'parsererror') {
      // Firefox parse error
      geoXML3.log('Unable to retrieve ' + doc.url + ': ' + responseXML.documentElement.childNodes[0].nodeValue);
      if (parserOptions.failedParse) parserOptions.failedParse(doc);    
      doc.failed = true;
      return;
    } else if (!doc) {
      throw 'geoXML3 internal error: render called with null document';
    } else { //no errors
      var i;
      doc.placemarks      = [];
      doc.groundoverlays  = [];
      doc.ggroundoverlays = [];
      doc.networkLinks    = [];
      doc.gpolygons       = [];
      doc.gpolylines      = [];

      // Declare some helper functions in local scope for better performance
      var nodeValue  = geoXML3.nodeValue;

      // Check for dependent KML files
      var nodes = responseXML.getElementsByTagName('styleUrl');
      var docSet = doc.internals.docSet;
      
      for (var i = 0; i < nodes.length; i++) {
        var url = nodeValue(nodes[i]).split('#')[0];
        if (!url)                 continue;  // #id (inside doc)
        var rUrl = cleanURL( doc.baseDir, url );
        if (rUrl === doc.baseUrl) continue;  // self
        if (docsByUrl[rUrl])      continue;  // already loaded

        var thisDoc;
        var j = docSet.indexOfObjWithItem('baseUrl', rUrl);
        if (j != -1) {
          // Already listed to be loaded, but probably in the wrong order.
          // Load it right away to immediately resolve dependency.
          thisDoc = docSet[j];
          if (thisDoc.failed) continue;  // failed to load last time; don't retry it again
        }
        else {
          // Not listed at all; add it in
          thisDoc           = new Object();
          thisDoc.url       = rUrl;  // url can't be trusted inside KMZ files, since it may .. outside of the archive
          thisDoc.baseUrl   = rUrl;
          thisDoc.internals = doc.internals;

          doc.internals.docSet.push(thisDoc);
          doc.internals.remaining++;
        }

        // render dependent KML first then re-run renderer
        fetchDoc(rUrl, thisDoc, function (thisResXML) {
          render(thisResXML, thisDoc);
          render(responseXML, doc);
        });
        
        // to prevent cross-dependency issues, just load the one
        // file first and re-check the rest later
        return;
      }

      // Parse styles
      doc.styles = styles[doc.baseUrl] = styles[doc.baseUrl] || {};
      var styleID, styleNodes;
      nodes = responseXML.getElementsByTagName('Style');
      nodeCount = nodes.length;
      for (i = 0; i < nodeCount; i++) {
        thisNode = nodes[i];
        var styleID = thisNode.getAttribute('id');
        if (!!styleID) processStyle(thisNode, doc.baseUrl, styleID, doc.baseDir);
      }
      // Parse StyleMap nodes
      nodes = responseXML.getElementsByTagName('StyleMap');
      for (i = 0; i < nodes.length; i++) {
        thisNode = nodes[i];
        var styleID = thisNode.getAttribute('id');
        if (!!styleID) processStyleMap(thisNode, doc.baseUrl, styleID, doc.baseDir);
      }

      if (!!parserOptions.processStyles || !parserOptions.createMarker) {
        // Convert parsed styles into GMaps equivalents
        processStyles(doc);
      }

      // Parse placemarks
      if (!!doc.reload && !!doc.markers) {
        for (i = 0; i < doc.markers.length; i++) {
          doc.markers[i].active = false;
        }
      }
      var placemark, node, coords, path, marker, poly;
      var placemark, coords, path, pathLength, marker, polygonNodes, coordList;
      var placemarkNodes = responseXML.getElementsByTagName('Placemark');
      for (pm = 0; pm < placemarkNodes.length; pm++) {
        // Init the placemark object
        node = placemarkNodes[pm];
        var styleUrl = geoXML3.nodeValue(node.getElementsByTagName('styleUrl')[0]).split('#');
        placemark = {
          name:         geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
          description:  geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
          styleUrl:     styleUrl.join('#'),
          styleBaseUrl: styleUrl[0] ? cleanURL(doc.baseDir, styleUrl[0]) : doc.baseUrl,
          styleID:      styleUrl[1],
          visibility:        geoXML3.getBooleanValue(node.getElementsByTagName('visibility')[0], true),
          balloonVisibility: geoXML3.getBooleanValue(geoXML3.getElementsByTagNameNS(node, gx, 'balloonVisibility')[0], !parserOptions.suppressInfoWindows)
        };
        placemark.style = (styles[placemark.styleBaseUrl] && styles[placemark.styleBaseUrl][placemark.styleID]) || clone(defaultStyle);
        // inline style overrides shared style
        var inlineStyles = node.getElementsByTagName('Style');
        if (inlineStyles && (inlineStyles.length > 0)) {
          var style = processStyle(node, '{inline}', '{inline}');
          processStyleID(style);
          if (style) placemark.style = style;
        }
        
        if (/^https?:\/\//.test(placemark.description)) {
          placemark.description = ['<a href="', placemark.description, '">', placemark.description, '</a>'].join('');
        }

        // record list of variables for substitution
        placemark.vars = {
          display: {
            name:         'Name',
            description:  'Description',
            address:      'Street Address',
            id:           'ID',
            Snippet:      'Snippet',
            geDirections: 'Directions'
          },
          val: {
            name:        placemark.name || '',
            description: placemark.description || '',
            address:     geoXML3.nodeValue(node.getElementsByTagName('address')[0], ''),
            id:          node.getAttribute('id') || '',
            Snippet:     geoXML3.nodeValue(node.getElementsByTagName('Snippet')[0], '')
          },
          directions: [
            'f=d',         
            'source=GeoXML3'
          ]
        };

        // add extended data to variables
        var extDataNodes = node.getElementsByTagName('ExtendedData');
        if (!!extDataNodes && extDataNodes.length > 0) {
          var dataNodes = extDataNodes[0].getElementsByTagName('Data');
          for (var d = 0; d < dataNodes.length; d++) {
            var dn    = dataNodes[d];
            var name  = dn.getAttribute('name');
            if (!name) continue;
            var dName = geoXML3.nodeValue(dn.getElementsByTagName('displayName')[0], name);
            var val   = geoXML3.nodeValue(dn.getElementsByTagName('value')[0]);
            
            placemark.vars.val[name]     = val;
            placemark.vars.display[name] = dName;
          }
        }
        
        // process MultiGeometry
        var GeometryNodes = node.getElementsByTagName('coordinates');
        var Geometry = null;
        if (!!GeometryNodes && (GeometryNodes.length > 0)) {
          for (var gn=0;gn<GeometryNodes.length;gn++) {
            if (GeometryNodes[gn].parentNode &&
                GeometryNodes[gn].parentNode.nodeName) {
              var GeometryPN = GeometryNodes[gn].parentNode;
              Geometry = GeometryPN.nodeName;

              // Extract the coordinates
              // What sort of placemark?
              switch(Geometry) {
                case "Point":
                  placemark.Point = processPlacemarkCoords(node, "Point")[0];
                  placemark.latlng = new google.maps.LatLng(placemark.Point.coordinates[0].lat, placemark.Point.coordinates[0].lng);
                  pathLength = 1;
                  break;
                case "LinearRing":
                  // Polygon/line
                  polygonNodes = node.getElementsByTagName('Polygon');
                  // Polygon
                  if (!placemark.Polygon)
                    placemark.Polygon = [{
                      outerBoundaryIs: {coordinates: []},
                      innerBoundaryIs: [{coordinates: []}]
                    }];
                  for (var pg=0;pg<polygonNodes.length;pg++) {
                     placemark.Polygon[pg] = {
                       outerBoundaryIs: {coordinates: []},
                       innerBoundaryIs: [{coordinates: []}]
                     }
                     placemark.Polygon[pg].outerBoundaryIs = processPlacemarkCoords(polygonNodes[pg], "outerBoundaryIs");
                     placemark.Polygon[pg].innerBoundaryIs = processPlacemarkCoords(polygonNodes[pg], "innerBoundaryIs");
                  }
                  coordList = placemark.Polygon[0].outerBoundaryIs;
                  break;

                case "LineString":
                  pathLength = 0;
                  placemark.LineString = processPlacemarkCoords(node,"LineString");
                  break;

                default:
                  break;
              }
            }
          }
        }

        // call the custom placemark parse function if it is defined
        if (!!parserOptions.pmParseFn) parserOptions.pmParseFn(node, placemark);
        doc.placemarks.push(placemark);
        
        // single marker
        if (placemark.Point) {
          if (!!google.maps) {
            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
            doc.bounds.extend(placemark.latlng);
          }
          
          // Potential user-defined marker handler
          var pointCreateFunc = parserOptions.createMarker || createMarker;
          var found = false;
          if (!parserOptions.createMarker) {
            // Check to see if this marker was created on a previous load of this document
            if (!!doc) {
              doc.markers = doc.markers || [];
              if (doc.reload) {
                for (var j = 0; j < doc.markers.length; j++) {
                  if (doc.markers[j].getPosition().equals(placemark.latlng)) {
                    found = doc.markers[j].active = true;
                    break;
                  }
                }
              }
            }
          }
          if (!found) {
            // Call the marker creator
            var marker = pointCreateFunc(placemark, doc);
            if (marker) marker.active = placemark.visibility;
          }
        }
        // polygon/line
        var poly, line;
        if (!!doc) {
          if (placemark.Polygon)    doc.gpolygons  = doc.gpolygons  || [];
          if (placemark.LineString) doc.gpolylines = doc.gpolylines || [];
        }
          
        var polyCreateFunc = parserOptions.createPolygon    || createPolygon;
        var lineCreateFunc = parserOptions.createLineString || createPolyline;
        if (placemark.Polygon) {
          poly = polyCreateFunc(placemark,doc);
          if (poly) poly.active = placemark.visibility;
        }
        if (placemark.LineString) {
          line = lineCreateFunc(placemark,doc);
          if (line) line.active = placemark.visibility;
        }
        if (!!google.maps) {
          doc.bounds = doc.bounds || new google.maps.LatLngBounds();
          if (poly) doc.bounds.union(poly.bounds);
          if (line) doc.bounds.union(line.bounds);
        }

      } // placemark loop

      if (!!doc.reload && !!doc.markers) {
        for (i = doc.markers.length - 1; i >= 0 ; i--) {
          if (!doc.markers[i].active) {
            if (!!doc.markers[i].infoWindow) {
              doc.markers[i].infoWindow.close();
            }
            doc.markers[i].setMap(null);
            doc.markers.splice(i, 1);
          }
        }
      }

      // Parse ground overlays
      if (!!doc.reload && !!doc.groundoverlays) {
        for (i = 0; i < doc.groundoverlays.length; i++) {
          doc.groundoverlays[i].active = false;
        }
      }

      if (!!doc) {
        doc.groundoverlays = doc.groundoverlays || [];
      }
      // doc.groundoverlays =[];
      var groundOverlay, color, transparency, overlay;
      var groundNodes = responseXML.getElementsByTagName('GroundOverlay');
      for (i = 0; i < groundNodes.length; i++) {
        node = groundNodes[i];

        // Detect images buried in KMZ files (and use a base64 encoded URL)
        var gnUrl = cleanURL( doc.baseDir, geoXML3.nodeValue(node.getElementsByTagName('href')[0]) );
        if (kmzMetaData[gnUrl]) gnUrl = kmzMetaData[gnUrl].dataUrl;

        // Init the ground overlay object
        groundOverlay = {
          name:        geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
          description: geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
          icon: { href: gnUrl },
          latLonBox: {
            north: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('north')[0])),
            east:  parseFloat(geoXML3.nodeValue(node.getElementsByTagName('east')[0])),
            south: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('south')[0])),
            west:  parseFloat(geoXML3.nodeValue(node.getElementsByTagName('west')[0]))
          }
        };
        if (!!google.maps) {
          doc.bounds = doc.bounds || new google.maps.LatLngBounds();
          doc.bounds.union(new google.maps.LatLngBounds(
            new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
            new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
          ));
        }

        // Opacity is encoded in the color node
        var colorNode = node.getElementsByTagName('color');
        if (colorNode && colorNode.length > 0) {
          groundOverlay.opacity = geoXML3.getOpacity(nodeValue(colorNode[0]));
        } else {
          groundOverlay.opacity = 1.0;  // KML default
        }

        doc.groundoverlays.push(groundOverlay);
        if (!!parserOptions.createOverlay) {
          // User-defined overlay handler
          parserOptions.createOverlay(groundOverlay, doc);
        } else {
          // Check to see if this overlay was created on a previous load of this document
          var found = false;
          if (!!doc) {
            doc.groundoverlays = doc.groundoverlays || [];
            if (doc.reload) {
              overlayBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
                new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
              );
              var overlays = doc.groundoverlays;
              for (i = overlays.length; i--;) {
                if ((overlays[i].bounds().equals(overlayBounds)) &&
                    (overlays.url_ === groundOverlay.icon.href)) {
                  found = overlays[i].active = true;
                  break;
                }
              }
            }
          }

          if (!found) {
            // Call the built-in overlay creator
            overlay = createOverlay(groundOverlay, doc);
            overlay.active = true;
          }
        }
        if (!!doc.reload && !!doc.groundoverlays && !!doc.groundoverlays.length) {
          var overlays = doc.groundoverlays;
          for (i = overlays.length; i--;) {
            if (!overlays[i].active) {
              overlays[i].remove();
              overlays.splice(i, 1);
            }
          }
          doc.groundoverlays = overlays;
        }
      }
      
      // Parse network links
      var networkLink;
      var docPath = document.location.pathname.split('/');
      docPath = docPath.splice(0, docPath.length - 1).join('/');
      var linkNodes = responseXML.getElementsByTagName('NetworkLink');
      for (i = 0; i < linkNodes.length; i++) {
        node = linkNodes[i];

        // Init the network link object
        networkLink = {
          name: geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
          link: {
            href:        geoXML3.nodeValue(node.getElementsByTagName('href')[0]),
            refreshMode: geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0])
          }
        };

        // Establish the specific refresh mode
        if (networkLink.link.refreshMode === '') {
          networkLink.link.refreshMode = 'onChange';
        }
        if (networkLink.link.refreshMode === 'onInterval') {
          networkLink.link.refreshInterval = parseFloat(geoXML3.nodeValue(node.getElementsByTagName('refreshInterval')[0]));
          if (isNaN(networkLink.link.refreshInterval)) {
            networkLink.link.refreshInterval = 0;
          }
        } else if (networkLink.link.refreshMode === 'onChange') {
          networkLink.link.viewRefreshMode = geoXML3.nodeValue(node.getElementsByTagName('viewRefreshMode')[0]);
          if (networkLink.link.viewRefreshMode === '') {
            networkLink.link.viewRefreshMode = 'never';
          }
          if (networkLink.link.viewRefreshMode === 'onStop') {
            networkLink.link.viewRefreshTime = geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0]);
            networkLink.link.viewFormat =      geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0]);
            if (networkLink.link.viewFormat === '') {
              networkLink.link.viewFormat = 'BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]';
            }
          }
        }

        if (!/^[\/|http]/.test(networkLink.link.href)) {
          // Fully-qualify the HREF
          networkLink.link.href = docPath + '/' + networkLink.link.href;
        }

        // Apply the link
        if ((networkLink.link.refreshMode === 'onInterval') &&
            (networkLink.link.refreshInterval > 0)) {
          // Reload at regular intervals
          setInterval(parserName + '.parse("' + networkLink.link.href + '")',
                      1000 * networkLink.link.refreshInterval);
        } else if (networkLink.link.refreshMode === 'onChange') {
          if (networkLink.link.viewRefreshMode === 'never') {
            // Load the link just once
            doc.internals.parser.parse(networkLink.link.href, doc.internals.docSet);
          } else if (networkLink.link.viewRefreshMode === 'onStop') {
            // Reload when the map view changes

          }
        }
      }
    }

    if (!!doc.bounds) {
      doc.internals.bounds = doc.internals.bounds || new google.maps.LatLngBounds();
      doc.internals.bounds.union(doc.bounds);
    }
    if (!!doc.markers || !!doc.groundoverlays || !!doc.gpolylines || !!doc.gpolygons) {
      doc.internals.parseOnly = false;
    }

    if (!doc.internals.parseOnly) {
      // geoXML3 is not being used only as a real-time parser, so keep the processed documents around
      if (!docsByUrl[doc.baseUrl]) {
        docs.push(doc);
        docsByUrl[doc.baseUrl] = doc;
      }
      else {
        // internal replacement, which keeps the same memory ref loc in docs and docsByUrl
        for (var i in docsByUrl[doc.baseUrl]) {
          docsByUrl[doc.baseUrl][i] = doc[i];
        }
      }
    }

    doc.internals.remaining--;
    if (doc.internals.remaining === 0) {
      // We're done processing this set of KML documents
      // Options that get invoked after parsing completes
      if (parserOptions.zoom && !!doc.internals.bounds) {
        parserOptions.map.fitBounds(doc.internals.bounds);
      }
      if (parserOptions.afterParse) {
        parserOptions.afterParse(doc.internals.docSet);
      }
    }
  };

  var kmlColor = function (kmlIn, colorMode) {
    var kmlColor = {};
    kmlIn = kmlIn || 'ffffffff';  // white (KML 2.2 default)

    var aa = kmlIn.substr(0,2);
    var bb = kmlIn.substr(2,2);
    var gg = kmlIn.substr(4,2);
    var rr = kmlIn.substr(6,2);

    kmlColor.opacity = parseInt(aa, 16) / 256;
    kmlColor.color   = (colorMode === 'random') ? randomColor(rr, gg, bb) : '#' + rr + gg + bb;
    return kmlColor;
  };

  // Implemented per KML 2.2 <ColorStyle> specs
  var randomColor = function(rr, gg, bb) {
    var col = { rr: rr, gg: gg, bb: bb };
    for (var k in col) {
      var v = col[k];
      if (v == null) v = 'ff';

      // RGB values are limiters for random numbers (ie: 7f would be a random value between 0 and 7f)
      v = Math.round(Math.random() * parseInt(rr, 16)).toString(16);
      if (v.length === 1) v = '0' + v;
      col[k] = v;
    }

    return '#' + col.rr + col.gg + col.bb;
  };

  var processStyleID = function (style) {
    var icon = style.icon;
    if (!icon.href) return;
    
    if (icon.img && !icon.img.complete) {
      // we're still waiting on the image loading (probably because we've been blocking since the declaration)
      // so, let's queue this function on the onload stack
      icon.markerBacklog = [];
      icon.img.onload = function() {
        if (icon.dim.w < 0 || icon.dim.h < 0) {
          icon.dim.w = this.width;
          icon.dim.h = this.height;
        }
        processStyleID(style);
        
        // we will undoubtedly get some createMarker queuing, so set this up in advance
        for (var i = 0; i < icon.markerBacklog.length; i++) {
          var p = icon.markerBacklog[i][0];
          var d = icon.markerBacklog[i][1];
          createMarker(p, d);
          if (p.marker) p.marker.active = true;
        }
        delete icon.markerBacklog;
      };
      return;
    }
    else if (icon.dim.w < 0 || icon.dim.h < 0) {
      if (icon.img && icon.img.complete) {
        // sometimes the file is already cached and it never calls onLoad
        icon.dim.w = icon.img.width;
        icon.dim.h = icon.img.height;
      }
      else {
        // settle for a default of 32x32
        icon.dim.whGuess = true;
        icon.dim.w = 32;
        icon.dim.h = 32;
      }
    }
    
    // pre-scaled variables
    var rnd = Math.round;
    var scaled = {
      x:  icon.dim.x     * icon.scale,
      y:  icon.dim.y     * icon.scale,
      w:  icon.dim.w     * icon.scale,
      h:  icon.dim.h     * icon.scale,
      aX: icon.hotSpot.x * icon.scale,
      aY: icon.hotSpot.y * icon.scale,
      iW: (icon.img ? icon.img.width  : icon.dim.w) * icon.scale,
      iH: (icon.img ? icon.img.height : icon.dim.h) * icon.scale
    };

    // Figure out the anchor spot
    var aX, aY;
    switch (icon.hotSpot.xunits) {
      case 'fraction':    aX = rnd(scaled.aX * icon.dim.w); break;
      case 'insetPixels': aX = rnd(icon.dim.w * icon.scale - scaled.aX); break;
      default:            aX = rnd(scaled.aX); break;  // already pixels
    }
    aY = rnd( ((icon.hotSpot.yunits === 'fraction') ? icon.dim.h : 1) * scaled.aY );  // insetPixels Y = pixels Y
    var iconAnchor = new google.maps.Point(aX, aY);
    
    // Sizes
    // (NOTE: Scale is applied to entire image, not just the section of the icon palette.)
    var iconSize   = icon.dim.whGuess  ? null : new google.maps.Size(rnd(scaled.w),  rnd(scaled.h));
    var iconScale  = icon.scale == 1.0 ? null : 
                     icon.dim.whGuess  ?        new google.maps.Size(rnd(scaled.w),  rnd(scaled.h))
                                              : new google.maps.Size(rnd(scaled.iW), rnd(scaled.iH));
    var iconOrigin = new google.maps.Point(rnd(scaled.x), rnd(scaled.y));
    
    // Detect images buried in KMZ files (and use a base64 encoded URL)
    if (kmzMetaData[icon.url]) icon.url = kmzMetaData[icon.url].dataUrl;
    
    // Init the style object with the KML icon
    icon.marker = new google.maps.MarkerImage(
      icon.url,    // url
      iconSize,    // size
      iconOrigin,  // origin
      iconAnchor,  // anchor
      iconScale    // scaledSize
    );

    // Look for a predictable shadow
    var stdRegEx = /\/(red|blue|green|yellow|lightblue|purple|pink|orange)(-dot)?\.png/;
    var shadowSize = new google.maps.Size(59, 32);
    var shadowPoint = new google.maps.Point(16, 32);
    if (stdRegEx.test(icon.href)) {
      // A standard GMap-style marker icon
      icon.shadow = new google.maps.MarkerImage(
        'http://maps.google.com/mapfiles/ms/micons/msmarker.shadow.png', // url
        shadowSize,                                                      // size
        null,                                                            // origin
        shadowPoint,                                                     // anchor
        shadowSize                                                       // scaledSize
      );
    } else if (icon.href.indexOf('-pushpin.png') > -1) {
      // Pushpin marker icon
      icon.shadow = new google.maps.MarkerImage(
        'http://maps.google.com/mapfiles/ms/micons/pushpin_shadow.png',  // url
        shadowSize,                                                      // size
        null,                                                            // origin
        shadowPoint,                                                     // anchor
        shadowSize                                                       // scaledSize
      );
    } /* else {
      // Other MyMaps KML standard icon
      icon.shadow = new google.maps.MarkerImage(
        icon.href.replace('.png', '.shadow.png'),                        // url
        shadowSize,                                                      // size
        null,                                                            // origin
        anchorPoint,                                                     // anchor
        shadowSize                                                       // scaledSize
      );
    } */
  }
  
  var processStyles = function (doc) {
    for (var styleID in doc.styles) {
      processStyleID(doc.styles[styleID]);
    }
  };

  var createMarker = function (placemark, doc) {
    // create a Marker to the map from a placemark KML object
    var icon = placemark.style.icon;
    
    if ( !icon.marker && icon.img ) {
      // yay, single point of failure is holding up multiple markers...
      icon.markerBacklog = icon.markerBacklog || [];
      icon.markerBacklog.push([placemark, doc]);
      return;
    }

    // Load basic marker properties
    var markerOptions = geoXML3.combineOptions(parserOptions.markerOptions, {
      map:      parserOptions.map,
      position: new google.maps.LatLng(placemark.Point.coordinates[0].lat, placemark.Point.coordinates[0].lng),
      title:    placemark.name,
      zIndex:   Math.round(placemark.Point.coordinates[0].lat * -100000)<<5,
      icon:     icon.marker,
      shadow:   icon.shadow,
      flat:     !icon.shadow
    });

    // Create the marker on the map
    var marker = new google.maps.Marker(markerOptions);
    if (!!doc) doc.markers.push(marker);

    // Set up and create the infowindow if it is not suppressed
    createInfoWindow(placemark, doc, marker);
    placemark.marker = marker;
    return marker;
  };

  var createOverlay = function (groundOverlay, doc) {
    // Add a ProjectedOverlay to the map from a groundOverlay KML object

    if (!window.ProjectedOverlay) {
      throw 'geoXML3 error: ProjectedOverlay not found while rendering GroundOverlay from KML';
    }

    var bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
        new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
    );
    var overlayOptions = geoXML3.combineOptions(parserOptions.overlayOptions, {percentOpacity: groundOverlay.opacity*100});
    var overlay = new ProjectedOverlay(parserOptions.map, groundOverlay.icon.href, bounds, overlayOptions);

    if (!!doc) {
      doc.ggroundoverlays = doc.ggroundoverlays || [];
      doc.ggroundoverlays.push(overlay);
    }

    return overlay;
  };

  // Create Polyline
  var createPolyline = function(placemark, doc) {
    var path = [];
    for (var j=0; j<placemark.LineString.length; j++) {
      var coords = placemark.LineString[j].coordinates;
      var bounds = new google.maps.LatLngBounds();
      for (var i=0;i<coords.length;i++) {
        var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
        path.push(pt);
        bounds.extend(pt);
      }
    }
    // point to open the infowindow if triggered
    var point = path[Math.floor(path.length/2)];
    // Load basic polyline properties
    var kmlStrokeColor = kmlColor(placemark.style.line.color, placemark.style.line.colorMode);
    var polyOptions = geoXML3.combineOptions(parserOptions.polylineOptions, {
      map:      parserOptions.map,
      path: path,
      strokeColor: kmlStrokeColor.color,
      strokeWeight: placemark.style.line.width,
      strokeOpacity: kmlStrokeColor.opacity,
      title:    placemark.name
    });
    var p = new google.maps.Polyline(polyOptions);
    p.bounds = bounds;

    // setup and create the infoWindow if it is not suppressed
    createInfoWindow(placemark, doc, p);
    if (!!doc) doc.gpolylines.push(p);
    placemark.polyline = p;
    return p;
  }

  // Create Polygon
  var createPolygon = function(placemark, doc) {
    var bounds = new google.maps.LatLngBounds();
    var pathsLength = 0;
    var paths = [];
    for (var polygonPart=0;polygonPart<placemark.Polygon.length;polygonPart++) {
      for (var j=0; j<placemark.Polygon[polygonPart].outerBoundaryIs.length; j++) {
        var coords = placemark.Polygon[polygonPart].outerBoundaryIs[j].coordinates;
        var path = [];
        for (var i=0;i<coords.length;i++) {
          var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
          path.push(pt);
          bounds.extend(pt);
        }
        paths.push(path);
        pathsLength += path.length;
      }
      for (var j=0; j<placemark.Polygon[polygonPart].innerBoundaryIs.length; j++) {
        var coords = placemark.Polygon[polygonPart].innerBoundaryIs[j].coordinates;
        var path = [];
        for (var i=0;i<coords.length;i++) {
          var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
          path.push(pt);
          bounds.extend(pt);
        }
        paths.push(path);
        pathsLength += path.length;
      }
    }

    // Load basic polygon properties
    var kmlStrokeColor = kmlColor(placemark.style.line.color, placemark.style.line.colorMode);
    var kmlFillColor = kmlColor(placemark.style.poly.color, placemark.style.poly.colorMode);
    if (!placemark.style.poly.fill) kmlFillColor.opacity = 0.0;
    var strokeWeight = placemark.style.line.width;
    if (!placemark.style.poly.outline) {
      strokeWeight = 0;
      kmlStrokeColor.opacity = 0.0;
    }
    var polyOptions = geoXML3.combineOptions(parserOptions.polygonOptions, {
      map:      parserOptions.map,
      paths:    paths,
      title:    placemark.name,
      strokeColor: kmlStrokeColor.color,
      strokeWeight: strokeWeight,
      strokeOpacity: kmlStrokeColor.opacity,
      fillColor: kmlFillColor.color,
      fillOpacity: kmlFillColor.opacity
    });
    var p = new google.maps.Polygon(polyOptions);
    p.bounds = bounds;

    createInfoWindow(placemark, doc, p);
    if (!!doc) doc.gpolygons.push(p);
    placemark.polygon = p;
    return p;
  }
  
  var createInfoWindow = function(placemark, doc, gObj) {
    var bStyle = placemark.style.balloon;
    var vars = placemark.vars;
    
    if (!placemark.balloonVisibility || bStyle.displayMode === 'hide') return;
    
    // define geDirections
    if (placemark.latlng) {
      vars.directions.push('sll=' + placemark.latlng.toUrlValue());
      
      var url = 'http://maps.google.com/maps?' + vars.directions.join('&');
      var address = encodeURIComponent( vars.val.address || placemark.latlng.toUrlValue() ).replace(/\%20/g, '+');
      
      vars.val.geDirections = '<a href="' + url + '&daddr=' + address + '" target=_blank>To Here</a> - <a href="' + url + '&saddr=' + address + '" target=_blank>From Here</a>';
    }
    
    // add in the variables
    var iwText = bStyle.text.replace(/\$\[(\w+(\/displayName)?)\]/g, function(txt, n, dn) { return dn ? vars.display[n] : vars.val[n]; });
    var classTxt = 'geoxml3_infowindow geoxml3_style_' + placemark.styleID;
    
    // color styles
    var styleArr = [];
    if (bStyle.bgColor   != 'ffffffff') styleArr.push('background: ' + kmlColor(bStyle.bgColor  ).color + ';');
    if (bStyle.textColor != 'ff000000') styleArr.push('color: '      + kmlColor(bStyle.textColor).color + ';');
    var styleProp = styleArr.length ? ' style="' + styleArr.join(' ') + '"' : '';
    
    var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
      content: '<div class="' + classTxt + '"' + styleProp + '>' + iwText + '</div>',
      pixelOffset: new google.maps.Size(0, 2)
    });
    
    gObj.infoWindow = parserOptions.infoWindow || new google.maps.InfoWindow(infoWindowOptions);
    gObj.infoWindowOptions = infoWindowOptions;

    // Info Window-opening event handler
    google.maps.event.addListener(gObj, 'click', function(e) {
      var iW = this.infoWindow;
      iW.close();
      iW.setOptions(this.infoWindowOptions);

      if      (e && e.latLng) iW.setPosition(e.latLng);
      else if (this.bounds)   iW.setPosition(this.bounds.getCenter());

      iW.open(this.map, this.bounds ? null : this);
    });

  }

  return {
    // Expose some properties and methods

    options:     parserOptions,
    docs:        docs,
    docsByUrl:   docsByUrl,
    kmzMetaData: kmzMetaData,

    parse:          parse,
    parseKmlString: parseKmlString,
    hideDocument:   hideDocument,
    showDocument:   showDocument,
    processStyles:  processStyles,
    createMarker:   createMarker,
    createOverlay:  createOverlay,
    createPolyline: createPolyline,
    createPolygon:  createPolygon
  };
};
// End of KML Parser

// Helper objects and functions
geoXML3.getOpacity = function (kmlColor) {
  // Extract opacity encoded in a KML color value. Returns a number between 0 and 1.
  if (!!kmlColor &&
      (kmlColor !== '') &&
      (kmlColor.length == 8)) {
    var transparency = parseInt(kmlColor.substr(0, 2), 16);
    return transparency / 255;
  } else {
    return 1;
  }
};

// Log a message to the debugging console, if one exists
geoXML3.log = function(msg) {
  if (!!window.console) {
    console.log(msg);
  } else { alert("log:"+msg); }
};

// Combine two options objects: a set of default values and a set of override values
geoXML3.combineOptions = function (overrides, defaults) {
  var result = {};
  if (!!overrides) {
    for (var prop in overrides) {
      if (overrides.hasOwnProperty(prop)) {
        result[prop] = overrides[prop];
      }
    }
  }
  if (!!defaults) {
    for (prop in defaults) {
      if (defaults.hasOwnProperty(prop) && (result[prop] === undefined)) {
        result[prop] = defaults[prop];
      }
    }
  }
  return result;
};

// Retrieve an XML document from url and pass it to callback as a DOM document
geoXML3.fetchers = [];

// parse text to XML doc
/**
 * Parses the given XML string and returns the parsed document in a
 * DOM data structure. This function will return an empty DOM node if
 * XML parsing is not supported in this browser.
 * @param {string} str XML string.
 * @return {Element|Document} DOM.
 */
geoXML3.xmlParse = function (str) {
  if (typeof ActiveXObject != 'undefined' && typeof GetObject != 'undefined') {
    var doc = new ActiveXObject('Msxml2.DOMDocument');
    doc.loadXML(str);
    return doc;
  }

  if (typeof DOMParser != 'undefined') {
    return (new DOMParser()).parseFromString(str, 'text/xml');
  }

  return createElement('div', null);
}

geoXML3.fetchXML = function (url, callback) {
  function timeoutHandler() {
    callback();
  };

  var xhrFetcher = new Object();
  if (!!geoXML3.fetchers.length) {
    xhrFetcher = geoXML3.fetchers.pop();
  } else {
    if (!!window.XMLHttpRequest) {
      xhrFetcher.fetcher = new window.XMLHttpRequest(); // Most browsers
    } else if (!!window.ActiveXObject) {
      xhrFetcher.fetcher = new window.ActiveXObject('Microsoft.XMLHTTP'); // Some IE
    }
  }

  if (!xhrFetcher.fetcher) {
    geoXML3.log('Unable to create XHR object');
    callback(null);
  } else {
      if (xhrFetcher.fetcher.overrideMimeType) {
        xhrFetcher.fetcher.overrideMimeType('text/xml');
      }
      xhrFetcher.fetcher.open('GET', url, true);
      xhrFetcher.fetcher.onreadystatechange = function () {
      if (xhrFetcher.fetcher.readyState === 4) {
        // Retrieval complete
        if (!!xhrFetcher.xhrtimeout)
          clearTimeout(xhrFetcher.xhrtimeout);
        if (xhrFetcher.fetcher.status >= 400) {
          geoXML3.log('HTTP error ' + xhrFetcher.fetcher.status + ' retrieving ' + url);
          callback();
        } else {
          // Returned successfully
          callback(xhrFetcher.fetcher.responseXML);
        }
        // We're done with this fetcher object
        geoXML3.fetchers.push(xhrFetcher);
      }
    };
    xhrFetcher.xhrtimeout = setTimeout(timeoutHandler, 60000);
    xhrFetcher.fetcher.send(null);
  }
};

geoXML3.fetchZIP = function (url, callback, parser) {
  // Just need a single 'new' declaration with a really long function...
  var zipFile = new ZipFile(url, function (zip) {
    // Retrieval complete

    // Check for ERRORs in zip.status
    for (var i = 0; i < zip.status.length; i++) {
      var msg = zip.status[i];
      if      (msg.indexOf("ERROR") == 0) {
        geoXML3.log('HTTP/ZIP error retrieving ' + url + ': ' + msg);
        callback();
        return;
      }
      else if (msg.indexOf("WARNING") == 0) {  // non-fatal, but still might be useful
        geoXML3.log('HTTP/ZIP warning retrieving ' + url + ': ' + msg);
      }
    }

    // Make sure KMZ structure is according to spec (with a single KML file in the root dir)
    var KMLCount = 0;
    var KML;
    for (var i = 0; i < zip.entries.length; i++) {
      var name = zip.entries[i].name;
      if (!/\.kml$/.test(name)) continue;
      
      KMLCount++;
      if (KMLCount == 1) KML = i;
      else {
        geoXML3.log('KMZ warning retrieving ' + url + ': found extra KML "' + name + '" in KMZ; discarding...');
      }
    }

    // Returned successfully, but still needs extracting
    var baseUrl = cleanURL(defileURL(url), url) + '/';
    var kmlProcessing = {  // this is an object just so it gets passed properly
      timer: null,
      extractLeft: 0,
      timerCalls: 0
    };
    var extractCb = function(entry, entryContent) {
      var mdUrl = cleanURL(baseUrl, entry.name);
      var ext = entry.name.substring(entry.name.lastIndexOf(".") + 1).toLowerCase();
      kmlProcessing.extractLeft--;

      if ((typeof entryContent.description == "string") && (entryContent.name == "Error")) {
        geoXML3.log('KMZ error extracting ' + mdUrl + ': ' + entryContent.description);
        callback();
        return;        
      }

      // MIME types that can be used in KML
      var mime;
      if (ext === 'jpg') ext = 'jpeg';
      if (/^(gif|jpeg|png)$/.test(ext)) mime = 'image/' + ext;
      else if (ext === 'mp3')           mime = 'audio/mpeg';
      else if (ext === 'm4a')           mime = 'audio/mp4';
      else if (ext === 'm4a')           mime = 'audio/MP4-LATM';
      else                              mime = 'application/octet-stream';

      parser.kmzMetaData[mdUrl] = {};
      parser.kmzMetaData[mdUrl].entry = entry;
      // data:image/gif;base64,R0lGODlhEAAOALMA...
      parser.kmzMetaData[mdUrl].dataUrl = 'data:' + mime + ';base64,' + base64Encode(entryContent);
      
      // IE cannot handle GET requests beyond 2071 characters, even if it's an inline image
      if ($.browser.msie && parser.kmzMetaData[mdUrl].dataUrl.length > 2071)
        parser.kmzMetaData[mdUrl].dataUrl =
        // this is a simple IE icon; to hint at the problem...
        'data:image/gif;base64,R0lGODlhDwAQAOMPADBPvSpQ1Dpoyz1p6FhwvU2A6ECP63CM04CWxYCk+V6x+UK++Jao3rvC3fj7+v///yH5BAEKAA8ALAAAAAAPABAAAASC8Mk5mwCAUMlWwcLRHEelLA' + 
        'oGDMgzSsiyGCAhCETDPMh5XQCBwYBrNBIKWmg0MCQHj8MJU5IoroYCY6AAAgrDIbbQDGIK6DR5UPhlNo0JAlSUNAiDgH7eNAxEDWAKCQM2AAFheVxYAA0AIkFOJ1gBcQQaUQKKA5w7LpcEBwkJaKMUEQA7';
    };
    var kmlExtractCb = function(entry, entryContent) {
      if ((typeof entryContent.description == "string") && (entryContent.name == "Error")) {
        geoXML3.log('KMZ error extracting ' + mdUrl + ': ' + entryContent.description);
        callback();
        return;        
      }

      // check to see if the KML is the last file extracted
      clearTimeout(kmlProcessing.timer);
      if (kmlProcessing.extractLeft <= 1) {
        kmlProcessing.extractLeft--;
        callback(geoXML3.xmlParse(entryContent));
        return;
      }
      else {
        // KML file isn't last yet; it may need to use those files, so wait a bit (100ms)
        kmlProcessing.timerCalls++;
        if (kmlProcessing.timerCalls < 100) {
          kmlProcessing.timer = setTimeout(function() { kmlExtractCb(entry, entryContent); }, 100);
        }
        else {
          geoXML3.log('KMZ warning extracting ' + url + ': entire ZIP has not been extracted after 10 seconds; running through KML, anyway...');
          kmlProcessing.extractLeft--;
          callback(geoXML3.xmlParse(entryContent));
        }
      }
      return;
    };
    for (var i = 0; i < zip.entries.length; i++) {
      var entry = zip.entries[i];
      var ext = entry.name.substring(entry.name.lastIndexOf(".") + 1).toLowerCase();
      if (!/^(gif|jpe?g|png|kml)$/.test(ext)) continue;  // not going to bother to extract files we don't support
      if (ext === "kml" && i != KML)          continue;  // extra KMLs get discarded
      if (!parser && ext != "kml")            continue;  // cannot store images without a parser object

      // extract asynchronously
      kmlProcessing.extractLeft++;
      if (ext === "kml") entry.extract(kmlExtractCb);
      else               entry.extract(extractCb);
    }
  });

};

// nodeValue: Extract the text value of a DOM node, with leading and trailing whitespace trimmed
geoXML3.nodeValue = function(node, defVal) {
  var retStr="";
  if (!node) {
    return (typeof defVal === 'undefined' || defVal === null) ? '' : defVal;
  }
   if(node.nodeType==3||node.nodeType==4||node.nodeType==2){
      retStr+=node.nodeValue;
   }else if(node.nodeType==1||node.nodeType==9||node.nodeType==11){
      for(var i=0;i<node.childNodes.length;++i){
         retStr+=arguments.callee(node.childNodes[i]);
      }
   }
   return retStr;
};

geoXML3.getBooleanValue = function(node, defVal) {
  var nodeContents = geoXML3.nodeValue(node);
  if (!nodeContents) return defVal || null;
  if (nodeContents) nodeContents = parseInt(nodeContents);
  if (isNaN(nodeContents)) return true;
  if (nodeContents == 0) return false;
  else return true;
}

// IE8 doesn't define this, yay!
geoXML3.getElementsByTagNameNS = 
  (Element && Element.prototype && Element.prototype.getElementsByTagNameNS) ? Element.prototype.getElementsByTagNameNS.call :
function(node, namespace, tagname) {
  var result = [];
  var root = node.ownerDocument.childNodes[1];
  
  // search for namespace prefix
  for (var i = 0; i < root.attributes.length; i++) {
    var attr = root.attributes[i];
    if (attr.prefix === 'xmlns' && attr.nodeValue === namespace)
      return node.getElementsByTagName(attr.baseName + ':' + tagname);
  }
  return null;
};


// toAbsUrl: Turn a directory + relative URL into an absolute one
var toAbsURL = function (d, s) {
  var p, f, i;
  var h = location.protocol + "://" + location.host;

  if (!s.length)           return '';
  if (/^\w+:/.test(s))     return s;
  if (s.indexOf('/') == 0) return h + s;

  p = d.replace(/\/[^\/]*$/, '');
  f = s.match(/\.\.\//g);
  if (f) {
    s = s.substring(f.length * 3);
    for (i = f.length; i--;) { p = p.substring(0, p.lastIndexOf('/')); }
  }

  return h + p + '/' + s;
}

//dehostUrl: Remove current host from URL (change it to a root-based relative URL)
var dehostURL = function (s) {
  var h = location.protocol + "://" + location.host;
  h = h.replace(/([\.\\\+\*\?\[\^\]\$\(\)])/g, '\\$1');  // quotemeta
  return s.replace(new RegExp('^' + h, 'i'), '');
}

var cleanURL  = function (d, s) { return dehostURL(toAbsURL(d.split('#')[0].split('?')[0], s.split('#')[0].split('?')[0])); }
var defileURL = function (s)    { return s.substr(0, s.lastIndexOf('/') + 1); }

// Some extra Array subs for ease of use
// http://stackoverflow.com/questions/143847/best-way-to-find-an-item-in-a-javascript-array
Array.prototype.hasObject = (
  !Array.indexOf ? function (obj) {
    var l = this.length + 1;
    while (l--) {
      if (this[l - 1] === obj) return true;
    }
    return false;
  } : function (obj) {
    return (this.indexOf(obj) !== -1);
  }
);
Array.prototype.hasItemInObj = function (name, item) {
  var l = this.length + 1;
  while (l--) {
    if (this[l - 1][name] === item) return true;
  }
  return false;
};
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
      fromIndex = 0;
    } else if (fromIndex < 0) {
      fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex, j = this.length; i < j; i++) {
      if (this[i] === obj) return i;
    }
    return -1;
  };
}
Array.prototype.indexOfObjWithItem = function (name, item, fromIndex) {
  if (fromIndex == null) {
    fromIndex = 0;
  } else if (fromIndex < 0) {
    fromIndex = Math.max(0, this.length + fromIndex);
  }
  for (var i = fromIndex, j = this.length; i < j; i++) {
    if (this[i][name] === item) return i;
  }
  return -1;
};

// borrowed from jquery.base64.js, with some "Array as input" corrections
var base64Encode = function(input) {
  var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "";
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;
  while (i < input.length) {
    chr1 = input[i++];
    chr2 = input[i++];
    chr3 = input[i++];
    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if      (chr2 == undefined) enc3 = enc4 = 64;
    else if (chr3 == undefined) enc4 = 64;

    output = output + keyString.charAt(enc1) + keyString.charAt(enc2) + keyString.charAt(enc3) + keyString.charAt(enc4);
  }
  return output;
};
