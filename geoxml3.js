/*
    geoxml3.js

    Renders KML on the Google Maps JavaScript API Version 3 
    http://code.google.com/p/geoxml3/


    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
  var docs = []; // Individual KML documents
  var lastPlacemark;
  var parserName;
  // Private methods

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
      var baseUrl = urls[i].split('?')[0];
      for (j = 0; j < docs.length; j++) {
        if (baseUrl === docs[j].baseUrl) {
          // Reloading an existing document
          thisDoc = docs[j];
          thisDoc.url       = urls[i];
          thisDoc.internals = internals;
          thisDoc.reload    = true;
          docs.splice(j, 1);
          break;
        }
      }
      thisDoc = thisDoc || {
        url:       urls[i], 
        baseUrl:   baseUrl, 
        internals: internals
      };
      internals.docSet.push(thisDoc);
      geoXML3.fetchXML(thisDoc.url, function (responseXML) {render(responseXML, thisDoc);});
    }
  };

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
    if (!!doc.groundoverlays) {
      for (i = 0; i < doc.groundoverlays.length; i++) {
      doc.groundoverlays[i].setOpacity(0);
      }
    }
    if (!!doc.gpolylines) {
      for (i=0;i<doc.gpolylines.length;i++) {
        doc.gpolylines[i].setMap(null);
      }
    }
    if (!!doc.gpolygons) {
      for (i=0;i<doc.gpolygons.length;i++) {
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
    if (!!doc.groundoverlays) {
      for (i = 0; i < doc.groundoverlays.length; i++) {
        doc.groundoverlays[i].setOpacity(doc.groundoverlays[i].percentOpacity_);
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
      coordList.push({
        lat: parseFloat(coords[1]), 
        lng: parseFloat(coords[0]), 
        alt: parseFloat(coords[2])
      });
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
      if (parserOptions.failedParse) {
        parserOptions.failedParse(doc);
      }
    } else if (!doc) {
      throw 'geoXML3 internal error: render called with null document';
    } else { //no errors
      var i;
      var styles = {};
      doc.placemarks     = [];
      doc.groundOverlays = [];
      doc.networkLinks   = [];
      doc.gpolygons      = [];
      doc.gpolylines     = [];

    // Declare some helper functions in local scope for better performance
    var nodeValue  = geoXML3.nodeValue;

      // Parse styles
    var styleID, styleNodes;
    nodes = responseXML.getElementsByTagName('Style');
    nodeCount = nodes.length;
    for (i = 0; i < nodeCount; i++) {
      thisNode = nodes[i];
      styleID    = '#' + thisNode.getAttribute('id');
      styleNodes = thisNode.getElementsByTagName('Icon');
      if (!!styleNodes.length) {
        styles[styleID] = {
          href: nodeValue(styleNodes[0].getElementsByTagName('href')[0])
        };
      }
      styleNodes = thisNode.getElementsByTagName('LineStyle');
      if (!!styleNodes.length) {
        styles[styleID] = {
          color: nodeValue(styleNodes[0].getElementsByTagName('color')[0]),
          width: nodeValue(styleNodes[0].getElementsByTagName('width')[0])
        };
      }
      styleNodes = thisNode.getElementsByTagName('PolyStyle');
      if (!!styleNodes.length) {
        styles[styleID] = styles[styleID] || {};
        styles[styleID].outline   = !!nodeValue(styleNodes[0].getElementsByTagName('outline')[0]);
        styles[styleID].fill      = !!nodeValue(styleNodes[0].getElementsByTagName('fill')[0]);
        styles[styleID].fillcolor = nodeValue(styleNodes[0].getElementsByTagName('color')[0]);
      }
    }
    doc.styles = styles;
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
        placemark = {
          name:  geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
          description: geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
          styleUrl: geoXML3.nodeValue(node.getElementsByTagName('styleUrl')[0])
        };
        placemark.style = doc.styles[placemark.styleUrl] || {};
        if (/^https?:\/\//.test(placemark.description)) {
          placemark.description = ['<a href="', placemark.description, '">', placemark.description, '</a>'].join('');
        }

        var Geometry = node.getElementsByTagName('coordinates');
	if (!!Geometry && (Geometry.length > 0) && Geometry[0].parentNode && Geometry[0].parentNode.nodeName) {
          Geometry = node.getElementsByTagName('coordinates')[0].parentNode.nodeName;
	} else {
	  Geometry = null;
	  continue;
	} 

        // Extract the coordinates
        // TODO: support MultiGeometry (see dateline for example)
        // TODO: support inner boundaries
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
            placemark.Polygon = [{
              outerBoundaryIs: {coordinates: []},
              innerBoundaryIs: [{coordinates: []}]
            }];
            for (var pg=0;pg<polygonNodes.length;pg++) {
               placemark.Polygon[pg] = {
                 outerBoundaryIs: {coordinates: []},
                 innerBoundaryIs: [{coordinates: []}]
               }
               placemark.Polygon[pg].outerBoundaryIs = processPlacemarkCoords(node, "outerBoundaryIs");
               placemark.Polygon[pg].innerBoundaryIs = processPlacemarkCoords(node, "innerBoundaryIs");
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
      doc.placemarks.push(placemark);
      
      if (Geometry == "Point") {
          if (parserOptions.zoom && !!google.maps) {
            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
            doc.bounds.extend(placemark.latlng);
          }

          if (!!parserOptions.createMarker) {
            // User-defined marker handler
            parserOptions.createMarker(placemark, doc);
          } else { // !user defined createMarker
            // Check to see if this marker was created on a previous load of this document
            var found = false;
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

            if (!found) {
              // Call the built-in marker creator
              marker = createMarker(placemark, doc);
              marker.active = true;
            }
          }
        } else { // poly test 2
          if (!!polygonNodes) { // polygon
            if (!!doc) {
              doc.gpolygons = doc.gpolygons || [];
            }

            if (!!parserOptions.createPolygon) {
              // User-defined polygon handler
              poly = parserOptions.createPolygon(placemark, doc);
            } else {  // ! user defined createPolygon
              // Check to see if this marker was created on a previous load of this document
              poly = createPolygon(placemark,doc);
              poly.active = true;
            }
          } else { // polyline
            if (!!doc) {
              doc.gpolylines = doc.gpolylines || [];
            }
            if (!!parserOptions.createPolyline) {
              // User-defined polyline handler
              poly = parserOptions.createPolyline(placemark, doc);
            } else { // ! user defined createPolyline
              // Check to see if this marker was created on a previous load of this document
              poly = createPolyline(placemark,doc);
              poly.active = true;
            }
          }
          if (parserOptions.zoom && !!google.maps) {
            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
            doc.bounds.union(poly.bounds);
          }
          
        }
      }
}
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
      var groundOverlay, color, transparency, overlay;
      var groundNodes = responseXML.getElementsByTagName('GroundOverlay');
      for (i = 0; i < groundNodes.length; i++) {
        node = groundNodes[i];
        
        // Init the ground overlay object
        groundOverlay = {
          name:        geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
          description: geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
          icon: {href: geoXML3.nodeValue(node.getElementsByTagName('href')[0])},
          latLonBox: {
            north: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('north')[0])),
            east:  parseFloat(geoXML3.nodeValue(node.getElementsByTagName('east')[0])),
            south: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('south')[0])),
            west:  parseFloat(geoXML3.nodeValue(node.getElementsByTagName('west')[0]))
          }
        };
        if (parserOptions.zoom && !!google.maps) {
          doc.bounds = doc.bounds || new google.maps.LatLngBounds();
          doc.bounds.union(new google.maps.LatLngBounds(
            new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
            new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
          ));
        }

      // Opacity is encoded in the color node
      var colorNode = thisNode.getElementsByTagName('color');
      if ( colorNode && colorNode.length && (colorNode.length > 0)) {
        groundOverlay.opacity = getOpacity(nodeValue(colorNode[0]));
      } else {
        groundOverlay.opacity = 0.45;
      }

      doc.groundOverlays.push(groundOverlay);
  
        if (!!parserOptions.createOverlay) {
          // User-defined overlay handler
          parserOptions.createOverlay(groundOverlay, doc);
        } else { // ! user defined createOverlay
          // Check to see if this overlay was created on a previous load of this document
          var found = false;
          if (!!doc) {
            doc.groundoverlays = doc.groundoverlays || [];
            if (doc.reload) {
              overlayBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
                new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east));
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
      }
      doc.groundoverlays = overlays;
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
            refreshMode:     geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0])
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

      if (!!doc.bounds) {
        doc.internals.bounds = doc.internals.bounds || new google.maps.LatLngBounds();
        doc.internals.bounds.union(doc.bounds); 
      }
      if (!!doc.markers || !!doc.groundoverlays || !!doc.gpolylines || !!doc.gpolygons) {
        doc.internals.parseOnly = false;
      }

      doc.internals.remaining -= 1;
      if (doc.internals.remaining === 0) {
        // We're done processing this set of KML documents
        // Options that get invoked after parsing completes
        if (!!doc.internals.bounds) {
          parserOptions.map.fitBounds(doc.internals.bounds); 
        }
        if (parserOptions.afterParse) {
          parserOptions.afterParse(doc.internals.docSet);
        }

        if (!doc.internals.parseOnly) {
          // geoXML3 is not being used only as a real-time parser, so keep the processed documents around
            for (var i=(doc.internals.docSet.length-1);i>=0;i--) {
              docs.push(doc.internals.docSet[i]);
            }
        }
      }
  };

var kmlColor = function (kmlIn) {
  var kmlColor = {};
  if (kmlIn) {
   aa = kmlIn.substr(0,2);
   bb = kmlIn.substr(2,2);
   gg = kmlIn.substr(4,2);
   rr = kmlIn.substr(6,2);
   kmlColor.color = "#" + rr + gg + bb;
   kmlColor.opacity = parseInt(aa,16)/256;
  } else {
   // defaults
   kmlColor.color = randomColor();
   kmlColor.opacity = 0.45;
  }
  return kmlColor;
}

var randomColor = function(){ 
  var color="#";
  var colorNum = Math.random()*8388607.0;  // 8388607 = Math.pow(2,23)-1
  var colorStr = colorNum.toString(16);
  color += colorStr.substring(0,colorStr.indexOf('.'));
  return color;
};

    
  var processStyles = function (doc) {
    var stdRegEx = /\/(red|blue|green|yellow|lightblue|purple|pink|orange)(-dot)?\.png/;
    for (var styleID in doc.styles) {
      if (!!doc.styles[styleID].href) {
        // Init the style object with a standard KML icon
        doc.styles[styleID].icon =  new google.maps.MarkerImage(
          doc.styles[styleID].href,
          new google.maps.Size(32, 32),
          new google.maps.Point(0, 0),
          new google.maps.Point(16, 12)
        );

        // Look for a predictable shadow
        if (stdRegEx.test(doc.styles[styleID].href)) {
          // A standard GMap-style marker icon
          doc.styles[styleID].shadow = new google.maps.MarkerImage(
              'http://maps.google.com/mapfiles/ms/micons/msmarker.shadow.png',
              new google.maps.Size(59, 32),
              new google.maps.Point(0, 0),
              new google.maps.Point(16, 12));
        } else if (doc.styles[styleID].href.indexOf('-pushpin.png') > -1) {
          // Pushpin marker icon
          doc.styles[styleID].shadow = new google.maps.MarkerImage(
            'http://maps.google.com/mapfiles/ms/micons/pushpin_shadow.png',
            new google.maps.Size(59, 32),
            new google.maps.Point(0, 0),
            new google.maps.Point(16, 12));
        } else {
          // Other MyMaps KML standard icon
          doc.styles[styleID].shadow = new google.maps.MarkerImage(
            doc.styles[styleID].href.replace('.png', '.shadow.png'),
            new google.maps.Size(59, 32),
            new google.maps.Point(0, 0),
            new google.maps.Point(16, 12));
        }
      }
    }
  };

  var createMarker = function (placemark, doc) {
    // create a Marker to the map from a placemark KML object

    // Load basic marker properties
    var markerOptions = geoXML3.combineOptions(parserOptions.markerOptions, {
      map:      parserOptions.map,
    position: new google.maps.LatLng(placemark.Point.coordinates[0].lat, placemark.Point.coordinates[0].lng),
      title:    placemark.name,
    zIndex:   Math.round(-placemark.Point.coordinates.lat * 100000),
      icon:     placemark.style.icon,
      shadow:   placemark.style.shadow 
    });
  
    // Create the marker on the map
    var marker = new google.maps.Marker(markerOptions);
    if (!!doc) {
      doc.markers.push(marker);
    }

    // Set up and create the infowindow
    var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
      content: '<div class="geoxml3_infowindow"><h3>' + placemark.name + 
               '</h3><div>' + placemark.description + '</div></div>',
      pixelOffset: new google.maps.Size(0, 2)
    });
    marker.infoWindow = new google.maps.InfoWindow(infoWindowOptions);

    // Infowindow-opening event handler
    google.maps.event.addListener(marker, 'click', function() {
      if (!!parserOptions.singleInfoWindow) {
        if (!!lastPlacemark && !!lastPlacemark.infoWindow) {
          lastPlacemark.infoWindow.close();
        }
        lastPlacemark = this;
      }
      this.infoWindow.open(this.map, this);
    });

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
    var overlayOptions = geoXML3.combineOptions(parserOptions.overlayOptions, {percentOpacity: groundOverlay.opacity});
    var overlay = new ProjectedOverlay(parserOptions.map, groundOverlay.icon.href, bounds, overlayOptions);
    
    if (!!doc) {
      doc.groundoverlays = doc.groundoverlays || [];
      doc.groundoverlays.push(overlay);
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
      // Load basic polyline properties
      var kmlStrokeColor = kmlColor(placemark.style.color);
      var polyOptions = geoXML3.combineOptions(parserOptions.polylineOptions, {
        map:      parserOptions.map,
        path: path,
        strokeColor: kmlStrokeColor.color,
        strokeWeight: placemark.style.width,
        strokeOpacity: kmlStrokeColor.opacity,
        title:    placemark.name
      });
      var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
        content: '<div class="geoxml3_infowindow"><h3>' + placemark.name + 
                 '</h3><div>' + placemark.description + '</div></div>',
        pixelOffset: new google.maps.Size(0, 2)
      });
    var p = new google.maps.Polyline(polyOptions);
    p.bounds = bounds;
    p.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
    if (!!doc) {
      doc.gpolylines.push(p);
    }
    // Infowindow-opening event handler
    google.maps.event.addListener(p, 'click', function(e) {
      if (!!parserOptions.singleInfoWindow) {
        if (!!lastPlacemark && !!lastPlacemark.infoWindow) {
          lastPlacemark.infoWindow.close();
        }
        lastPlacemark = this;
      }
      if (e && e.latLng) this.infoWindow.setPosition(e.latLng);
      this.infoWindow.open(this.map);
    });
/*
  if (this.opts.sidebarid) {
    var n = this.gpolylines.length-1;
    var blob = '&nbsp;&nbsp;<span style=";border-left:'+width+'px solid '+color+';">&nbsp;</span> ';
    this.side_bar_list.push (name + "$$$polyline$$$" + n +"$$$" + blob );
  }
*/
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

      // Load basic polyline properties
      var kmlStrokeColor = kmlColor(placemark.style.color);
      var kmlFillColor = kmlColor(placemark.style.fillcolor);
      var polyOptions = geoXML3.combineOptions(parserOptions.polygonOptions, {
        map:      parserOptions.map,
        paths:    paths,
        title:    placemark.name,
        strokeColor: kmlStrokeColor.color,
        strokeWeight: placemark.style.width,
        strokeOpacity: kmlStrokeColor.opacity,
        fillColor: kmlFillColor.color,
        fillOpacity: kmlFillColor.opacity
      });

      var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
        content: '<div class="geoxml3_infowindow"><h3>' + placemark.name + 
                 '</h3><div>' + placemark.description + '</div></div>',
        pixelOffset: new google.maps.Size(0, 2)
      });
    var p = new google.maps.Polygon(polyOptions);
    p.bounds = bounds;
    p.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
    if (!!doc) {
      doc.gpolygons.push(p);
    }
    // Infowindow-opening event handler
    google.maps.event.addListener(p, 'click', function(e) {
      if (!!parserOptions.singleInfoWindow) {
        if (!!lastPlacemark && !!lastPlacemark.infoWindow) {
          lastPlacemark.infoWindow.close();
        }
        lastPlacemark = this;
      }
      if (e && e.latLng) this.infoWindow.setPosition(e.latLng);
      this.infoWindow.open(this.map);
    });
/*
  if (this.opts.sidebarid) {
    var n = this.gpolylines.length-1;
    var blob = '&nbsp;&nbsp;<span style=";border-left:'+width+'px solid '+color+';">&nbsp;</span> ';
    this.side_bar_list.push (name + "$$$polyline$$$" + n +"$$$" + blob );
  }
*/
  return p;
}

  return {
    // Expose some properties and methods

    options: parserOptions,
    docs:    docs,
    
    parse:          parse,
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
    var doc = new ActiveXObject('Microsoft.XMLDOM');
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

  var xhrFetcher;
  if (!!geoXML3.fetchers.length) {
    xhrFetcher = geoXML3.fetchers.pop();
  } else {
    if (!!window.XMLHttpRequest) {
      xhrFetcher = new window.XMLHttpRequest(); // Most browsers
    } else if (!!window.ActiveXObject) {
      xhrFetcher = new window.ActiveXObject('Microsoft.XMLHTTP'); // Some IE
    }
  }

  if (!xhrFetcher) {
    geoXML3.log('Unable to create XHR object');
    callback(null);
  } else {
    xhrFetcher.open('GET', url, true);
    xhrFetcher.onreadystatechange = function () {
      if (xhrFetcher.readyState === 4) {
        // Retrieval complete
        if (!!geoXML3.xhrtimeout)
          clearTimeout(geoXML3.xhrtimeout);
        if (xhrFetcher.status >= 400) {
          geoXML3.log('HTTP error ' + xhrFetcher.status + ' retrieving ' + url);
          callback();
        } else {
          // Returned successfully
	    callback(geoXML3.xmlParse(xhrFetcher.responseText));
        }
        // We're done with this fetcher object
        geoXML3.fetchers.push(xhrFetcher);
      }
    };
    geoXML3.xhrtimeout = setTimeout(timeoutHandler, 60000);
    xhrFetcher.send(null);
  }
};

//nodeValue: Extract the text value of a DOM node, with leading and trailing whitespace trimmed
geoXML3.nodeValue = function(node) {
  var retStr="";
  if (!node) {
    return '';
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
