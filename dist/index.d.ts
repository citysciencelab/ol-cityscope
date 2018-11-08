export interface Source {
    url?: string;
    projection?: string;
    wmsParams?: {
        [key: string]: string | number | boolean;
    };
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
    weightAttribute?: string;
    weightAttributeMax?: number;
    gradient?: string[];
    radius?: number;
    blur?: number;
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
    scale?: {
        [key: string]: ol.Color;
    };
    scaleAttribute?: string;
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
export declare class Map {
    private config;
    baseLayers: MapLayer[];
    topicLayers: MapLayer[];
    mapFeaturesById: {
        [key: string]: ol.Feature;
    };
    private map;
    constructor(config: Config);
    on(type: string, listener: ol.EventsListenerFunctionType): void;
    setTarget(target: string): void;
    setView(center: ol.Coordinate, zoom: number, minZoom: number, maxZoom: number): void;
    getView(): ol.View;
    extentContainsCoordinate(coordinate: ol.Coordinate): boolean;
    featureBufferContainsCoordinate(featureId: string | number, coordinate: ol.Coordinate): boolean;
    applyDefaultStyle(featureId: string | number, layer: MapLayer): void;
    applySelectedStyle(featureId: string | number, layer: MapLayer): void;
    applyExtraStyle(featureId: string | number, layer: MapLayer): void;
    getCoordinateFromXY(x: number, y: number): ol.Coordinate | undefined;
    getSelectedFeatures(coordinate: ol.Coordinate): ol.Feature[];
    getSelectedLayer(feature: ol.Feature, coordinate: ol.Coordinate): MapLayer | undefined;
    getBaseLayerByName(name: string): MapLayer | undefined;
    getTopicLayerByName(name: string): MapLayer | undefined;
    zoomTo(coordinate: ol.Coordinate, zoom1: number, zoom2: number): void;
    private addLayers;
    private addSelectedStyleOnLayer;
}
export declare function getFeatureCenterpoint(feature: ol.Feature): ol.Coordinate;
export declare function getVectorLayerSource(layer: MapLayer): ol.source.Vector | undefined;
export declare function dispatchSelectEvent(layer: MapLayer, selected: ol.Feature[], coordinate: ol.Coordinate): void;
export declare function generateLayers(layersConfig: MapLayer[]): MapLayer[];
export declare function generateStyles(layers: MapLayer[]): void;
export declare function styleConfigToStyleFunction(style: LayerStyle, scale: {
    [key: string]: ol.Color;
} | undefined, scaleAttribute: string | undefined): ol.StyleFunction;
export declare function formatText(value: any, round: boolean): string;
export declare function getColorFromCategorizedScale(feature: ol.render.Feature | ol.Feature, attribute: string, scale: {
    [key: string]: ol.Color;
}): ol.Color;
export declare function getColorFromGraduatedScale(feature: ol.render.Feature | ol.Feature, attribute: string, scale: {
    [key: string]: ol.Color;
}): ol.Color;
