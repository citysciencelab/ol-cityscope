import { getUid } from 'ol';
import Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import { defaults as control_defaults, ScaleLine } from 'ol/control';
import { buffer as extent_buffer, containsCoordinate as extent_containsCoordinate, getCenter as extent_getCenter } from 'ol/extent';
import EsriJSON from 'ol/format/EsriJSON';
import GeoJSON from 'ol/format/GeoJSON';
import GML2 from 'ol/format/GML2';
import GML3 from 'ol/format/GML3';
import GPX from 'ol/format/GPX';
import IGC from 'ol/format/IGC';
import KML from 'ol/format/KML';
import MVT from 'ol/format/MVT';
import OSMXML from 'ol/format/OSMXML';
import Polyline from 'ol/format/Polyline';
import TopoJSON from 'ol/format/TopoJSON';
import WFS from 'ol/format/WFS';
import WKT from 'ol/format/WKT';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import { defaults as interaction_defaults, Select, } from 'ol/interaction';
import HeatmapLayer from 'ol/layer/Heatmap';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat as proj_fromLonLat, toLonLat as proj_toLonLat } from 'ol/proj';
import { register as proj4_register } from 'ol/proj/proj4';
import ImageWMSSource from 'ol/source/ImageWMS';
import OSMSource from 'ol/source/OSM';
import TileImageSource from 'ol/source/TileImage';
import TileWMSSource from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import FillStyle from 'ol/style/Fill';
import IconStyle from 'ol/style/Icon';
import StrokeStyle from 'ol/style/Stroke';
import { default as Style } from 'ol/style/Style';
import TextStyle from 'ol/style/Text';
import proj4 from 'proj4';
const formats = {
    'EsriJSON': EsriJSON,
    'GeoJSON': GeoJSON,
    'GML2': GML2,
    'GML3': GML3,
    'GPX': GPX,
    'IGC': IGC,
    'KML': KML,
    'MVT': MVT,
    'OSMXML': OSMXML,
    'Polyline': Polyline,
    'TopoJSON': TopoJSON,
    'WFS': WFS,
    'WKT': WKT,
    'WMSGetFeatureInfo': WMSGetFeatureInfo
};
const supportedProjections = {
    'EPSG:25832': '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
};
export class CsMap {
    constructor(config) {
        this.config = config;
        this.baseLayers = [];
        this.topicLayers = [];
        this.mapFeaturesById = {};
        // Register unknown map projections
        for (const [code, def] of Object.entries(supportedProjections)) {
            proj4.defs(code, def);
        }
        proj4_register(proj4);
        this.map = new Map({
            controls: control_defaults().extend([new ScaleLine()]),
            interactions: interaction_defaults({
                altShiftDragRotate: false,
                pinchRotate: false
            })
        });
        this.addLayers(this.config.baseLayers, this.config.topicLayers);
        this.selectInteraction = new Select({
            // Selectable layers
            layers: this.topicLayers.filter(layer => layer.selectable).reduce((layers, layer) => {
                if (!layer.olLayers) {
                    layer.olLayers = {};
                }
                layers.push(...Object.values(layer.olLayers).map(olLayer => olLayer.layer));
                return layers;
            }, []),
            // The filter function is hijacked in order to extract the association of the
            // selected feature and the layer it belongs to, which is needed to define the
            // style function (see below)
            filter: (feature, layer) => {
                this.selectedLayer = layer;
                return true;
            },
            // Because multiple select interactions for different layers don't work,
            // the layer needs to be determined within the style function. This way we can
            // use the styling associated with the layer the selected feature belongs to.
            style: (feature, resolution) => {
                let selectedStyleFn;
                for (const layer of this.topicLayers) {
                    if (!layer.olLayers) {
                        layer.olLayers = {};
                    }
                    for (const olLayer of Object.values(layer.olLayers)) {
                        if (getUid(olLayer.layer) === getUid(this.selectedLayer)) {
                            selectedStyleFn = olLayer.selectedStyleFn;
                            break;
                        }
                    }
                }
                if (typeof selectedStyleFn !== 'function') {
                    return new Style();
                }
                return selectedStyleFn(feature, resolution);
            },
            hitTolerance: 8
        });
        this.map.addInteraction(this.selectInteraction);
    }
    on(type, listener) {
        this.map.on(type, listener);
    }
    setTarget(target) {
        this.map.setTarget(target);
    }
    getView() {
        return this.map.getView();
    }
    setView(center, zoom, minZoom, maxZoom) {
        this.map.setView(new View({
            center: proj_fromLonLat(center),
            zoom: zoom,
            minZoom: minZoom,
            maxZoom: maxZoom
        }));
    }
    setPopUp(popup) {
        this.map.addOverlay(popup);
    }
    extentContainsCoordinate(coordinate) {
        const extent = this.map.getView().calculateExtent(this.map.getSize());
        return (coordinate[0] > extent[0] &&
            coordinate[1] > extent[1] &&
            coordinate[0] < extent[2] &&
            coordinate[1] < extent[3]);
    }
    featureBufferContainsCoordinate(featureId, coordinate) {
        const feature = this.mapFeaturesById[featureId];
        const geometry = feature.getGeometry();
        if (!geometry) {
            return false;
        }
        const buffer = extent_buffer(geometry.getExtent(), 100);
        return extent_containsCoordinate(buffer, coordinate);
    }
    // Conversion from display XY to map coordinates
    getCoordinateFromXY(x, y) {
        const coordinate = this.map.getCoordinateFromPixel([x * window.innerWidth, y * window.innerHeight]);
        if (!this.extentContainsCoordinate(coordinate)) {
            return;
        }
        return coordinate;
    }
    applyDefaultStyle(featureId, layer) {
        const feature = this.mapFeaturesById[featureId];
        if (!layer.olLayers) {
            layer.olLayers = {};
        }
        for (const olLayer of Object.values(layer.olLayers)) {
            if (olLayer.defaultStyleFn) {
                feature.setStyle(olLayer.defaultStyleFn);
            }
        }
    }
    applySelectedStyle(featureId, layer) {
        const feature = this.mapFeaturesById[featureId];
        if (!layer.olLayers) {
            layer.olLayers = {};
        }
        for (const olLayer of Object.values(layer.olLayers)) {
            if (olLayer.selectedStyleFn) {
                feature.setStyle(olLayer.selectedStyleFn);
            }
        }
    }
    applyExtraStyle(featureId, layer) {
        const feature = this.mapFeaturesById[featureId];
        if (!layer.olLayers) {
            layer.olLayers = {};
        }
        for (const olLayer of Object.values(layer.olLayers)) {
            if (olLayer.extraStyleFn) {
                feature.setStyle(olLayer.extraStyleFn);
            }
        }
    }
    getSelectedFeatures(coordinate) {
        let selectedFeatures = [];
        for (const layer of this.topicLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const olLayer of Object.values(layer.olLayers)) {
                const source = olLayer.layer.getSource();
                if (source.constructor === VectorSource) {
                    const features = source.getFeaturesAtCoordinate(coordinate);
                    selectedFeatures = selectedFeatures.concat(features);
                }
            }
        }
        return selectedFeatures;
    }
    getSelectedLayer(feature, coordinate) {
        let selectedLayer;
        for (const layer of this.topicLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const olLayer of Object.values(layer.olLayers)) {
                const source = olLayer.layer.getSource();
                if (source.constructor === VectorSource) {
                    const features = source.getFeaturesAtCoordinate(coordinate);
                    if (features.indexOf(feature) > -1) {
                        selectedLayer = layer;
                        break;
                    }
                }
            }
        }
        return selectedLayer;
    }
    getBaseLayerByName(name) {
        return this.baseLayers.find(layer => layer.name === name);
    }
    getTopicLayerByName(name) {
        return this.topicLayers.find(layer => layer.name === name);
    }
    buildPopup(element) {
        return new Overlay({
            element: element,
            stopEvent: false
        });
    }
    /**
     * Show/hide layers according to their "visible" property and (optionally) their category and stage.
     * Set "category" to null to show no layers at all
     */
    syncVisibleLayers(category, stage) {
        for (const layer of this.baseLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const [key, olLayer] of Object.entries(layer.olLayers)) {
                olLayer.layer.setVisible(layer.visible && (key === stage || key === '*'));
            }
        }
        for (const layer of this.topicLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const [key, olLayer] of Object.entries(layer.olLayers)) {
                olLayer.layer.setVisible(layer.visible
                    && (category !== null ? layer.category === category || !category : false)
                    && (key === stage || key === '*'));
            }
        }
    }
    /*
     * transform xy to lon/lat
     */
    fromLonLat(coordinate) {
        return proj_fromLonLat(coordinate);
    }
    /*
     * transform lon/lat to xy
     */
    toLonLat(coordinate) {
        return proj_toLonLat(coordinate);
    }
    /*
     * Create and dispatch a fake select event
     */
    dispatchSelectEvent(layer, selected, coordinate) {
        if (!layer.olLayers) {
            layer.olLayers = {};
        }
        for (const olLayer of Object.values(layer.olLayers)) {
            const source = olLayer.layer.getSource();
            if (source.constructor !== VectorSource) {
                throw new Error('Cannot find features: Source is not a vector source');
            }
            const deselected = source.getFeatures().filter(feature => selected.indexOf(feature) === -1);
            const selectEvent = {
                type: 'select',
                selected: selected,
                deselected: deselected,
                mapBrowserEvent: {
                    coordinate: coordinate
                }
            };
            this.selectInteraction.dispatchEvent(selectEvent);
        }
    }
    addLayers(baseLayersConfig, topicLayersConfig) {
        this.baseLayers = generateLayers(baseLayersConfig);
        this.topicLayers = generateLayers(topicLayersConfig);
        generateStyles(this.baseLayers);
        generateStyles(this.topicLayers);
        for (const layer of this.baseLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const olLayer of Object.values(layer.olLayers)) {
                this.map.addLayer(olLayer.layer);
                // Set the default/selected styles for each vector layer
                if (olLayer.layer.constructor === VectorLayer) {
                    olLayer.layer.setStyle(olLayer.defaultStyleFn);
                }
            }
        }
        for (const layer of this.topicLayers) {
            if (!layer.olLayers) {
                layer.olLayers = {};
            }
            for (const olLayer of Object.values(layer.olLayers)) {
                this.map.addLayer(olLayer.layer);
                // Set the default/selected styles for each vector layer
                if (olLayer.layer.constructor === VectorLayer) {
                    olLayer.layer.setStyle(olLayer.defaultStyleFn);
                }
            }
        }
    }
}
export function getFeatureCenterpoint(feature) {
    const geometry = feature.getGeometry();
    if (!geometry) {
        return undefined;
    }
    return extent_getCenter(geometry.getExtent());
}
export function generateLayers(layersConfig) {
    return layersConfig.map(layer => {
        // Normalize the config fields
        if (!layer.sources) {
            layer.sources = {};
        }
        if (layer.source) {
            if (!layer.sources.hasOwnProperty('*')) {
                layer.sources['*'] = layer.source;
            }
            else {
                console.warn('Not overriding the "*" source with "source" value in layer ' + layer.name);
            }
        }
        return layer;
    }).map(layer => {
        // Create the OpenLayers layers
        layer.olLayers = {};
        const sourceEntries = Object.entries(layer.sources || {}); // layer.sources won't be empty; just for tslint
        if (sourceEntries.length === 0) {
            throw new Error('No sources provided for layer ' + layer.name);
        }
        for (const [key, source] of sourceEntries) {
            layer.olLayers[key] = {};
            switch (layer.type) {
                case 'OSM':
                    layer.olLayers[key].layer = new TileLayer({
                        source: new OSMSource({
                            url: source.url ? source.url : undefined
                        }),
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                        visible: layer.visible
                    });
                    break;
                case 'Tile':
                    layer.olLayers[key].layer = new TileLayer({
                        source: new TileImageSource({
                            url: source.url,
                            projection: source.projection
                        }),
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                        visible: layer.visible
                    });
                    break;
                case 'WMS':
                    if (!source.wmsParams) {
                        throw new Error('No WMS params defined for layer ' + layer.name);
                    }
                    if (source.wmsParams.TILED) {
                        layer.olLayers[key].layer = new TileLayer({
                            source: new TileWMSSource({
                                url: source.url,
                                params: source.wmsParams
                            }),
                            opacity: layer.opacity,
                            zIndex: layer.zIndex,
                            visible: layer.visible
                        });
                    }
                    else {
                        layer.olLayers[key].layer = new ImageLayer({
                            source: new ImageWMSSource({
                                // In fact, 'url' is a required parameter for WMS, but due to overloading we cannot require
                                // the source.url parameter in all cases
                                url: source.url || '',
                                params: source.wmsParams,
                                projection: source.wmsProjection
                            }),
                            opacity: layer.opacity,
                            zIndex: layer.zIndex,
                            visible: layer.visible
                        });
                    }
                    break;
                case 'Vector':
                    if (!source.format || typeof formats[source.format] !== 'function') {
                        throw new Error('No vector format provided for layer ' + layer.name);
                    }
                    layer.olLayers[key].layer = new VectorLayer({
                        renderMode: 'image',
                        source: new VectorSource({
                            url: source.url,
                            format: new formats[source.format]()
                        }),
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                        visible: layer.visible
                    });
                    break;
                case 'Heatmap':
                    if (!source.format) {
                        throw new Error('No vector format provided for layer ' + layer.name);
                    }
                    if (!layer.weightAttribute || !layer.weightAttributeMax) {
                        throw new Error('No weight attribute provided for layer ' + layer.name);
                    }
                    layer.olLayers[key].layer = new HeatmapLayer({
                        source: new VectorSource({
                            url: source.url,
                            format: new formats[source.format]()
                        }),
                        weight: layer.weightAttribute ? (feature) => feature.get(layer.weightAttribute || '') / (layer.weightAttributeMax || 1) : () => 1,
                        gradient: layer.gradient && layer.gradient.length > 1 ? layer.gradient : ['#0ff', '#0f0', '#ff0', '#f00'],
                        radius: layer.radius !== undefined ? layer.radius : 16,
                        blur: layer.blur !== undefined ? layer.blur : 30,
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                        visible: layer.visible
                    });
                    break;
            }
        }
        return layer;
    }) || [];
}
export function generateStyles(layers) {
    for (const layer of layers) {
        if (!layer.olLayers) {
            layer.olLayers = {};
        }
        for (const olLayer of Object.values(layer.olLayers)) {
            if (layer.style) {
                olLayer.defaultStyleFn = styleConfigToStyleFunction(layer.style, layer.scale, layer.scaleAttribute);
            }
            if (layer.selectedStyle) {
                olLayer.selectedStyleFn = styleConfigToStyleFunction(layer.selectedStyle, layer.scale, layer.scaleAttribute);
            }
            if (layer.extraStyle) {
                olLayer.extraStyleFn = styleConfigToStyleFunction(layer.extraStyle, layer.scale, layer.scaleAttribute);
            }
        }
    }
}
export function styleConfigToStyleFunction(style, scale, scaleAttribute) {
    // Function to build a Fill object
    const getFill = (feature) => {
        if (!style.fill) {
            return;
        }
        if (style.fill.color) {
            return new FillStyle(style.fill);
        }
        if (style.fill.categorizedScale && scaleAttribute && scale) {
            return new FillStyle({
                color: getColorFromCategorizedScale(feature, scaleAttribute, scale)
            });
        }
        if (style.fill.graduatedScale && scaleAttribute && scale) {
            return new FillStyle({
                color: getColorFromGraduatedScale(feature, scaleAttribute, scale)
            });
        }
    };
    // Function to build a Stroke object
    const getStroke = (feature) => {
        if (!style.stroke) {
            return;
        }
        if (style.stroke.color) {
            return new StrokeStyle(style.stroke);
        }
        if (style.stroke.categorizedScale && scaleAttribute && scale) {
            return new StrokeStyle({
                color: getColorFromCategorizedScale(feature, scaleAttribute, scale),
                width: style.stroke.width
            });
        }
        if (style.stroke.graduatedScale && scaleAttribute && scale) {
            return new StrokeStyle({
                color: getColorFromGraduatedScale(feature, scaleAttribute, scale),
                width: style.stroke.width
            });
        }
    };
    const minResolution = style.text && style.text.minResolution ? style.text.minResolution : 0;
    const maxResolution = style.text && style.text.maxResolution ? style.text.maxResolution : Infinity;
    // Here the actual style function is returned
    return (feature, resolution) => new Style({
        fill: style.fill ? getFill(feature) : undefined,
        stroke: style.stroke ? getStroke(feature) : undefined,
        image: style.circle ? new CircleStyle({
            radius: style.circle.radius,
            fill: style.fill ? getFill(feature) : new FillStyle(style.circle.fill),
            stroke: style.stroke ? getStroke(feature) : new StrokeStyle(style.circle.stroke)
        }) : style.icon ? new IconStyle({
            src: style.icon.src,
            anchor: style.icon.anchor
        }) : undefined,
        text: style.text && resolution <= maxResolution && resolution >= minResolution ? new TextStyle({
            text: formatText(feature.get(style.text.attribute), style.text.round),
            font: style.text.font,
            fill: new FillStyle(style.text.fill),
            stroke: new StrokeStyle(style.text.stroke),
            offsetX: style.text.offsetX,
            offsetY: style.text.offsetY
        }) : undefined
    });
}
export function formatText(value, round) {
    if (value === null) {
        return '';
    }
    if (typeof value === 'number') {
        value = round ? Math.round(value) : value;
    }
    return '' + value;
}
export function getColorFromCategorizedScale(feature, attribute, scale) {
    if (!scale) {
        throw new Error('Cannot apply style: scale is not defined');
    }
    if (!attribute) {
        throw new Error('Cannot apply style: scale attribute is not defined');
    }
    if (!feature.get(attribute)) {
        console.warn("Cannot apply style: null value in properties");
        return [0, 0, 0, 0];
    }
    return scale[feature.get(attribute)];
}
export function getColorFromGraduatedScale(feature, attribute, scale) {
    if (!scale) {
        throw new Error('Cannot apply style: scale is not defined');
    }
    if (!attribute) {
        throw new Error('Cannot apply style: scale attribute is not defined');
    }
    let value = Number(String(feature.get(attribute)).replace(",", "."));
    if (value === null) {
        value = 0;
    }
    if (isNaN(value)) {
        console.warn('Cannot apply style: value is not a number');
        return [0, 0, 0, 0];
    }
    return Object.keys(scale).reduce((previous, current) => {
        const limit = parseInt(current, 10);
        if (value < limit) {
            return previous;
        }
        return scale[current];
    }, [0, 0, 0, 0]);
}
