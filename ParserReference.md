# `geoXML3.parser` Reference #
All top-level objects and functions are declared under a namespace of `geoXML3`. The core object is `geoXML3.parser`; typically, you'll instantiate a one `parser` per map. Its constructor takes a single `options` object parameter.

## `geoXML3.parser` Options ##
|**Name**|**Type**|**Default**|**Description**|
|:-------|:-------|:----------|:--------------|
|`map`|`google.maps.Map` object|`null`|The API map on which geo objects should be rendered.|
|`zoom`|`boolean`|`true`|If `true`, the parser will automatically move the map to a best-fit of the geodata after parsing of a KML document completes.|
|`singleInfoWindow`|`boolean`|`false`|If `true`, only a single `Marker` created by the parser will be able to have its InfoWindow open at once (simulating the behavior of GMaps API v2).|
|`suppressInfoWindows`|`boolean`|`false`|If `true`, suppresses the rendering of info windows.|
|`markerOptions`|`google.maps.Marker` options|`{}`|If the parser is adding `Marker`s to the map itself, any options specified here will be applied to them.|
|`infoWindowOptions`|`google.maps.InfoWindow` options|`{}`|If the parser is adding `Marker`s to the map itself, any options specified here will be applied to their attached InfoWindows.|
|`overlayOptions`|`ProjectedOverlay` options|`{}`|If the parser is adding `ProjectedOverlay`s to the map itself, any options specified here will be applied to them.|
|`afterParse`|callback function|`null`|This function will be called when parsing of a KML document is complete. The parsed data will be passed as a JSON `doc` object.|
|`failedParse`|callback function|`null`|This function will be called if KML parsing fails, usually due to a retrieval failure or malformed XML.|
|`createMarker`|callback function|`null`|If supplied, this function will be called once for each marker `<Placemark>` in the KML document, instead of the parser adding its own `Marker` to the map. The parsed data will be passed as a JSON placemark object.|
|`createOverlay`|callback function|`null`|If supplied, this function will be called once for each `<GroundOverlay>` in the KML document, instead of the parser adding its own `ProjectedOverlay` to the map. The parsed data will be passed as a JSON groundOverlay object.|
|`processStyles`|`boolean`|`false`|By default, the parser only processes KML `<Style>` elements into their GMaps equivalents if it will be creating its own `Marker`s (the `createMarker` option is `null`). Setting this option to `true` will force such processing to happen anyway, useful if you're going to be calling `parser.createMarker` yourself later. OTOH, leaving this option `false` removes runtime dependency on the GMaps API, enabling the use of geoxml3 as a standalone KML parser.|

## `geoXML3.parser` Properties ##
|**Name**|**Type**|**Description**|
|:-------|:-------|:--------------|
|`options`|`Object`|Exposes the options the parser was created with. Individual options can be modified to alter the behavior (for instance, to stop auto-zooming for subsequent documents).|
|`docs`|`Array`|Exposes the KML documents that have been processed by the parser, as JSON `doc` objects (see JsonObjects). Note: documents for which geoxml3 is being used solely as a real-time parser are not retained in this array.|

## `geoXML3.parser` Methods ##
|**Name**|**Description**|
|:-------|:--------------|
|`parse(url: String)`      `parse(urls: Array` of `String)`|Invoke processing of the KML document(s) located at the passed URL(s). Documents are downloaded and parsed asynchronously.|
|`parseKmlString(string: String)`      |Invoke processing of the KML string passed into the method.|
|`hideDocument(doc: Object)`|Visually remove from the map all geodata objects created by the parser for the given document.|
|`showDocument(doc: Object)`|Visually restore to the map all geodata objects created by the parser for the given document.|
|`processStyles(doc: Object)`|If the `processStyles` option (above) was set to `false`, disabling automatic generation of GMaps API objects from KML `<Style>` elements, this function can be called to invoke such processing manually. Must be called before `createMarker` (below) in order for created map `Marker`s to have style applied.|
|`createMarker(placemark: Object, doc`?`: Object)`|Returns a `google.maps.Marker` for the given JSON placemark. If the `map` option was supplied (either directly as an option to the `geoXML3.parser`, or within its `markerOptions`), the `Marker` will also be displayed on the map. The optional `doc` parameter will include this marker in the document-level `markers` array and qualify it for management by the parser (e.g., `hideDocument` and `showDocument`).|
|`createOverlay(groundOverlay: object, doc`?`: Object)`|Returns a `ProjectedOverlay` for the given JSON groundOverlay. If the `map` option was supplied to the `geoXML3.parser`, the `ProjectedOverlay` will also be displayed on the map. The optional `doc` parameter will include this overlay in the document-level `overlays` array and qualify it for management by the parser (e.g., `hideDocument` and `showDocument`).|