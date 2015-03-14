# Usage #
The geoxml3 library is specifically designed to accomodate a range of use cases, covering developer needs from beginner to advanced. In all cases, you'll need to download a copy of `geoxml3.js` (and `ProjectedOverlay.js`, if you want ground overlays) from this site and serve them to your map page from your own host, as follows:
```
  <script type="text/javascript" src="geoxml3.js"></script>
[ <script type="text/javascript" src="ProjectedOverlay.js"></script> ]
```

## Use Case 1: Basic KML rendering ##
To let geoxml3 handle all rendering of a KML document, simply instantiate `geoXML3.parser` with your v3 `map` object and call its `parse` function with the name of the target KML file.
```
  <script type="text/javascript">
    var myMap = new google.maps.Map(...);

    var myParser = new geoXML3.parser({map: myMap});
    myParser.parse('my_geodata.kml');
  </script>
```

There are a few other options you can pass to the `geoXML3.parser` constructor to adjust its behavior while still letting it do most of the work; see the ParserReference page for details.

## Use Case 2: Custom Handling of Map Objects ##
If you want more control of the map objects (`Marker`s and `ProjectedOverlay`s) created - say, you want to use a Marker Manager - you can pass callback functions as options to the `geoXML3.parser` constructor, and geoxml3 will call your functions for each marker/overlay rather than creating its own.
```
  <script type="text/javascript">
    var myMap = new google.maps.Map(...);

    var myParser = new geoXML3.parser({
      map: myMap,
      processStyles: true,
      createMarker: addMyMarker,
      createOverlay: addMyOverlay
    });
    myParser.parse(['my_geodata1.kml', 'my_geodata2.kml']);

    function addMyMarker(placemark) {
      // Marker handling code goes here
      if (someCondition) {
        myParser.createMarker(placemark);
      }
    };

    function addMyOverlay(groundOverlay) {
      // Overlay handling code goes here
      if (someCondition) {
        myParser.createOverlay(groundOverlay);
      }
    };
  </script>
```

The parameters passed to the callbacks are JSON objects containing lightly-processed data from the source KML `<Placemark>` and `<GroundOverlay>` elements; see JsonObjects for details. You can access this data to accomplish whatever marker/overlay processing you like. Optionally, you can call the `geoXML3.parser`'s own `createMarker` and `createOverlay` functions to create (and render) GMaps objects, as shown above.

The `geoXML3.parser` will also parse KML `<Style>` elements into GMaps API objects; it applies these styles automatically if it renders map objects itself, or you can access the parsed data using the `styles` property of the `doc` JSON object.

## Use Case 3: Standalone KML Parser ##
The use of the GMaps API is not required; if you don't ask `geoXML3.parser` to render map objects (or create them from `<Style>` elements), you can use it to simply retrieve KML documents and convert them to JSON. It can thus be used with other mapping systems, or even to display geodata in another form (such as text).
```
  <script type="text/javascript">
    var myParser = new geoXML3.parser({afterParse: useTheData});
    myParser.parse('my_geodata.kml');

    function useTheData(doc) {
      // Geodata handling goes here, using JSON properties of the doc object
      for (var i = 0; i < doc[0].placemarks.length; i++) {
        doSomething;
      }
    };
  </script>
```

A callback function supplied to the `afterParse` option will be called when parsing of the KML document is complete, and it will be passed a pointer to the parent JSON object for the parsed data. See JsonObjects for more info on the `doc` object and its properties.
## Use Case 4: Parse KML text to map ##
To use geoxml3 to parse KML from a string (or a text box) , simply instantiate geoXML3.parser with your v3 map object and call its parseKmlString function with the valid KML text.
```
  <script type="text/javascript">
    var myMap = new google.maps.Map(...);

    var myParser = new geoXML3.parser({map: myMap});
    myParser.parseKmlString('<kml>...</kml>');
  </script>
```