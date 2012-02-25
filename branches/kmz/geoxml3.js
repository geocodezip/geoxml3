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
    if (obj.cloneNode) return obj.cloneNode(true);
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
    } else {
	vars.val.geDirections = "";
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
geoXML3.getElementsByTagNameNS = function(node, namespace, tagname) {
 if (node && node.getElementsByTagNameNS) return node.getElementsByTagNameNS(namespace, tagname);
  var result = [];
  var root = node.ownerDocument.childNodes[1];
  
  if (!root.attributes) return new Array();
  // search for namespace prefix
  for (var i = 0; i < root.attributes.length; i++) {
    var attr = root.attributes[i];
    if (attr.prefix === 'xmlns' && attr.nodeValue === namespace)
      return node.getElementsByTagName(attr.baseName + ':' + tagname);
  }
  return new Array(); // empty result set
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

var cleanURL  = function (d, s) { return dehostURL(toAbsURL(d ? d.split('#')[0].split('?')[0] : defileURL(location.pathname), s ? s.split('#')[0].split('?')[0] : '')); }
var defileURL = function (s)    { return s ? s.substr(0, s.lastIndexOf('/') + 1) : '/'; }


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
