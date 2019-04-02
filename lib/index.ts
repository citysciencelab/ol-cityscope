import OlMap from 'ol/Map';
import View from 'ol/View';
import control from 'ol/control';
import extent from 'ol/extent';
import EsriJSON from 'ol/format/EsriJSON';
import Feature from 'ol/format/Feature';
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
import WMSCapabilities from 'ol/format/WMSCapabilities';
import WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import XML from 'ol/format/XML';
import interaction from 'ol/interaction';
import HeatmapLayer from 'ol/layer/Heatmap';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import proj from 'ol/proj';
import ImageWMSSource from 'ol/source/ImageWMS';
import OSMSource from 'ol/source/OSM';
import TileImageSource from 'ol/source/TileImage';
import TileWMSSource from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import FillStyle from 'ol/style/Fill';
import IconStyle from 'ol/style/Icon';
import StrokeStyle from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import TextStyle from 'ol/style/Text';

const formats: { [key: string]: typeof Feature } = {
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
  'WMSCapabilities': WMSCapabilities,
  'WMSGetFeatureInfo': WMSGetFeatureInfo,
  'WMTSCapabilities': WMTSCapabilities,
  'XML': XML
};

export interface Source {
  url?: string;
  projection?: string;
  wmsParams?: { [key: string]: string | number | boolean };
  wmsProjection?: string;
  format?: string;
}

export interface Fill {
  color?: string;
  categorizedScale?: boolean;
  graduatedScale?: boolean;
}

export interface Stroke {
  color?: string;
  width?: number;
  categorizedScale?: boolean;
  graduatedScale?: boolean;
}

export interface LayerStyle {
  fill?: Fill;
  stroke?: Stroke;
  circle?: {
    radius: number;
    fill: Fill;
    stroke: Stroke;
  };
  icon?: {
    anchor?: [number, number];
    src: string;
  };
  text?: {
    maxResolution?: number;
    minResolution?: number;
    attribute: string;
    round: boolean;
    font: string;
    fill: Fill;
    stroke: Stroke;
    offsetX?: number;
    offsetY?: number;
  };
}

export interface MapLayer {
  name: string;
  displayName: string;
  type: 'WMS' | 'OSM' | 'Tile' | 'Vector' | 'Heatmap';
  source: Source;
  // Heatmap
  weightAttribute?: string;
  weightAttributeMax?: number;
  gradient?: string[];
  radius?: number;
  blur?: number;
  // all types
  opacity?: number;
  zIndex?: number;
  visible: boolean;
  selectable?: boolean;
  legendHtml?: string;
  legendUrl?: string;
  meta?: string;
  style?: LayerStyle;
  selectedStyle?: LayerStyle;
  extraStyle?: LayerStyle;
  scale?: { [key: string]: ol.Color };
  scaleAttribute?: string;
  // No config - assigned at runtime
  olLayer?: ol.layer.Layer;
  olDefaultStyleFn?: ol.StyleFunction;
  olSelectedStyleFn?: ol.StyleFunction;
  olExtraStyleFn?: ol.StyleFunction;
  olSelectInteraction?: ol.interaction.Select;
}

export interface Config {
  baseLayers: MapLayer[];
  topicLayers: MapLayer[];
}

export class Map {
  baseLayers: MapLayer[] = [];
  topicLayers: MapLayer[] = [];
  mapFeaturesById: { [key: string]: ol.Feature } = {};
  private map: ol.Map;

  constructor(private config: Config) {
    this.map = new OlMap({
      controls: control.defaults().extend([new control.ScaleLine()]),
      interactions: interaction.defaults({
        altShiftDragRotate: false,
        pinchRotate: false
      })
    });

    this.addLayers(this.config.baseLayers, this.config.topicLayers);
  }

  on(type: string, listener: ol.EventsListenerFunctionType): void {
    this.map.on(type, listener);
  }

  setTarget(target: string): void {
    this.map.setTarget(target);
  }

  setView(center: ol.Coordinate, zoom: number, minZoom: number, maxZoom: number): void {
    this.map.setView(new View({
      center: proj.fromLonLat(center),
      zoom: zoom,
      minZoom: minZoom,
      maxZoom: maxZoom
    }));
  }

  getView(): ol.View {
    return this.map.getView();
  }

  extentContainsCoordinate(coordinate: ol.Coordinate): boolean {
    const extent = this.map.getView().calculateExtent(this.map.getSize());
    return (
      coordinate[0] > extent[0] &&
      coordinate[1] > extent[1] &&
      coordinate[0] < extent[2] &&
      coordinate[1] < extent[3]
    );
  }

  featureBufferContainsCoordinate(featureId: string | number, coordinate: ol.Coordinate): boolean {
    const feature = this.mapFeaturesById[featureId];
    const buffer = extent.buffer(feature.getGeometry().getExtent(), 100);
    return extent.containsCoordinate(buffer, coordinate);
  }

  applyDefaultStyle(featureId: string | number, layer: MapLayer) {
    const feature = this.mapFeaturesById[featureId];
    if (!layer.olDefaultStyleFn) {
      return;
    }
    feature.setStyle(layer.olDefaultStyleFn);
  }

  applySelectedStyle(featureId: string | number, layer: MapLayer) {
    const feature = this.mapFeaturesById[featureId];
    if (!layer.olSelectedStyleFn) {
      return;
    }
    feature.setStyle(layer.olSelectedStyleFn);
  }

  applyExtraStyle(featureId: string | number, layer: MapLayer) {
    const feature = this.mapFeaturesById[featureId];
    if (!layer.olExtraStyleFn) {
      return;
    }
    feature.setStyle(layer.olExtraStyleFn);
  }

  // Conversion from display XY to map coordinates
  getCoordinateFromXY(x: number, y: number): ol.Coordinate | undefined {
    const coordinate = this.map.getCoordinateFromPixel([x * window.innerWidth, y * window.innerHeight]);
    if (!this.extentContainsCoordinate(coordinate)) {
      return;
    }
    return coordinate;
  }

  getSelectedFeatures(coordinate: ol.Coordinate): ol.Feature[] {
    let selectedFeatures: ol.Feature[] = [];
    for (const layer of this.topicLayers) {
      if (!layer.olLayer) {
        continue;
      }
      const source = layer.olLayer.getSource();
      if (source.constructor === VectorSource) {
        const features = (<ol.source.Vector>source).getFeaturesAtCoordinate(coordinate);
        selectedFeatures = selectedFeatures.concat(features);
      }
    }
    return selectedFeatures;
  }

  getSelectedLayer(feature: ol.Feature, coordinate: ol.Coordinate): MapLayer | undefined {
    let selectedLayer = undefined;
    for (const layer of this.topicLayers) {
      if (!layer.olLayer) {
        continue;
      }
      const source = layer.olLayer.getSource();
      if (source.constructor === VectorSource) {
        const features = (<ol.source.Vector>source).getFeaturesAtCoordinate(coordinate);
        if (features.indexOf(feature) > -1) {
          selectedLayer = layer;
          break;
        }
      }
    }
    return selectedLayer;
  }

  getBaseLayerByName(name: string): MapLayer | undefined {
    return this.baseLayers.find(layer => layer.name === name);
  }

  getTopicLayerByName(name: string): MapLayer | undefined {
    return this.topicLayers.find(layer => layer.name === name);
  }

  /*
   * Zoom out, fly to the feature, zoom in
   */
  zoomTo(coordinate: ol.Coordinate, zoom1: number, zoom2: number): void {
    this.map.getView().animate(
      { zoom: zoom1 },
      { center: coordinate },
      { zoom: zoom2 }
    );
  }

  private addLayers(baseLayersConfig: MapLayer[], topicLayersConfig: MapLayer[]): void {
    this.baseLayers = generateLayers(baseLayersConfig);
    this.topicLayers = generateLayers(topicLayersConfig);

    generateStyles(this.baseLayers);
    generateStyles(this.topicLayers);

    for (const layer of this.baseLayers.concat(this.topicLayers)) {
      if (!layer.olLayer) {
        break;
      }
      this.map.addLayer(layer.olLayer);

      // Set the default/selected styles for each vector layer
      if (layer.olLayer.constructor === VectorLayer) {
        (<ol.layer.Vector>layer.olLayer).setStyle(layer.olDefaultStyleFn);

        if (layer.selectable) {
          this.addSelectedStyleOnLayer(layer);
        }
      }
    }
  }

  private addSelectedStyleOnLayer(layer: MapLayer): void {
    if (!layer.olLayer) {
      return;
    }
    layer.olSelectInteraction = new interaction.Select({
      // Make this interaction work only for the layer provided
      layers: [layer.olLayer],
      style: (feature: ol.render.Feature | ol.Feature, resolution: number) => {
        if (!layer.olSelectedStyleFn) {
          return null;
        }
        return layer.olSelectedStyleFn(feature, resolution);
      },
      hitTolerance: 8
    });

    if (!layer.olSelectInteraction) {
      return;
    }
    this.map.addInteraction(layer.olSelectInteraction);
  }
}

export function getFeatureCenterpoint(feature: ol.Feature): ol.Coordinate {
  return extent.getCenter(feature.getGeometry().getExtent());
}

export function getVectorLayerSource(layer: MapLayer): ol.source.Vector | undefined {
  if (!layer.olLayer) {
    return;
  }
  const source = <ol.source.Vector>layer.olLayer.getSource();
  if (source.constructor !== VectorSource) {
    return;
  }
  return source;
}

export function dispatchSelectEvent(layer: MapLayer, selected: ol.Feature[], coordinate: ol.Coordinate): void {
  if (!layer.olLayer || !layer.olSelectInteraction) {
    return;
  }
  const source = <ol.source.Vector>layer.olLayer.getSource();
  if (source.constructor !== VectorSource) {
    return;
  }
  const deselected = source.getFeatures().filter(feature => selected.indexOf(feature) === -1);

  const selectEvent = <ol.interaction.Select.Event>{
    type: 'select',
    selected: selected,
    deselected: deselected,
    mapBrowserEvent: {
      coordinate: coordinate
    }
  };
  layer.olSelectInteraction.dispatchEvent(selectEvent);
}

export function generateLayers(layersConfig: MapLayer[]): MapLayer[] {
  return layersConfig.map(layer => {
    // Create the OpenLayers layer
    switch (layer.type) {
      case 'OSM':
        layer.olLayer = new TileLayer({
          source: new OSMSource({
            url: layer.source.url ? layer.source.url : undefined
          }),
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          visible: layer.visible
        });
        break;
      case 'Tile':
        layer.olLayer = new TileLayer({
          source: new TileImageSource({
            url: layer.source.url,
            projection: layer.source.projection
          }),
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          visible: layer.visible
        });
        break;
      case 'WMS':
        if (!layer.source.wmsParams) {
          throw new Error('No WMS params defined for layer ' + layer.name);
        }
        if (layer.source.wmsParams.TILED) {
          layer.olLayer = new TileLayer({
            source: new TileWMSSource({
              url: layer.source.url,
              params: layer.source.wmsParams
            }),
            opacity: layer.opacity,
            zIndex: layer.zIndex,
            visible: layer.visible
          });
        } else {
          layer.olLayer = new ImageLayer({
            source: new ImageWMSSource({
              url: layer.source.url,
              params: layer.source.wmsParams,
              projection: layer.source.wmsProjection
            }),
            opacity: layer.opacity,
            zIndex: layer.zIndex,
            visible: layer.visible
          });
        }
        break;
      case 'Vector':
        if (!layer.source.format || typeof formats[layer.source.format] !== 'function') {
          throw new Error('No vector format provided for layer ' + layer.name);
        }
        layer.olLayer = new VectorLayer({
          renderMode: 'image', // for performance
          source: new VectorSource({
            url: layer.source.url,
            format: new formats[layer.source.format]()
          }),
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          visible: layer.visible
        });
        break;
      case 'Heatmap':
        if (!layer.source.format) {
          throw new Error('No vector format provided for layer ' + layer.name);
        }
        if (!layer.weightAttribute || !layer.weightAttributeMax) {
          throw new Error('No weight attribute provided for layer ' + layer.name);
        }
        layer.olLayer = new HeatmapLayer({
          source: new VectorSource({
            url: layer.source.url,
            format: new formats[layer.source.format]()
          }),
          weight: layer.weightAttribute ? (feature: ol.Feature) => feature.get(layer.weightAttribute || '') / (layer.weightAttributeMax || 1) : () => 1,
          gradient: layer.gradient && layer.gradient.length > 1 ? layer.gradient : ['#0ff', '#0f0', '#ff0', '#f00'],
          radius: layer.radius !== undefined ? layer.radius : 16,
          blur: layer.blur !== undefined ? layer.blur : 30,
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          visible: layer.visible
        });
        break;
    }
    return layer;
  }) || [];
}

export function generateStyles(layers: MapLayer[]) {
  for (const layer of layers) {
    if (layer.style) {
      layer.olDefaultStyleFn = styleConfigToStyleFunction(layer.style, layer.scale, layer.scaleAttribute);
    }
    if (layer.selectedStyle) {
      layer.olSelectedStyleFn = styleConfigToStyleFunction(layer.selectedStyle, layer.scale, layer.scaleAttribute);
    }
    if (layer.extraStyle) {
      layer.olExtraStyleFn = styleConfigToStyleFunction(layer.extraStyle, layer.scale, layer.scaleAttribute);
    }
  }
}

export function styleConfigToStyleFunction(style: LayerStyle, scale: { [key: string]: ol.Color } | undefined, scaleAttribute: string | undefined): ol.StyleFunction {
  // Function to build a Fill object
  const getFill = (feature: ol.render.Feature | ol.Feature) => {
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
  const getStroke = (feature: ol.render.Feature | ol.Feature) => {
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
  return (feature: ol.render.Feature | ol.Feature, resolution: number) => new Style({
    fill: style.fill ? getFill(feature) : undefined,
    stroke: style.stroke ? getStroke(feature) : undefined,
    image: style.circle ? new CircleStyle({
      radius: style.circle.radius,
      fill: new FillStyle(style.circle.fill),
      stroke: new StrokeStyle(style.circle.stroke)
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

export function formatText(value: any, round: boolean): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'number') {
    value = round ? Math.round(value) : value;
  }
  return '' + value;
}

export function getColorFromCategorizedScale(feature: ol.render.Feature | ol.Feature, attribute: string, scale: { [key: string]: ol.Color }): ol.Color {
  if (!scale) {
    throw new Error('Cannot apply style: scale is not defined');
  }
  if (!attribute) {
    throw new Error('Cannot apply style: scale attribute is not defined');
  }
  return scale[feature.get(attribute)];
}

export function getColorFromGraduatedScale(feature: ol.render.Feature | ol.Feature, attribute: string, scale: { [key: string]: ol.Color }): ol.Color {
  if (!scale) {
    throw new Error('Cannot apply style: scale is not defined');
  }
  if (!attribute) {
    throw new Error('Cannot apply style: scale attribute is not defined');
  }
  let value = feature.get(attribute);
  if (value === null) {
    value = 0;
  }
  if (typeof value !== 'number') {
    throw new Error('Cannot apply style: value is not a number');
  }
  return Object.keys(scale).reduce((previous, current) => {
    const limit = parseInt(current, 10);
    if (value < limit) {
      return previous;
    }
    return scale[current];
  }, <ol.Color>[0, 0, 0, 1]);
}
