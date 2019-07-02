import { default as Feature, FeatureLike } from 'ol/Feature';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import { Color } from 'ol/color';
import { Coordinate } from 'ol/coordinate';
import { ListenerFunction } from 'ol/events';
import { Select } from 'ol/interaction';
import { Layer } from 'ol/layer';
import RenderFeature from 'ol/render/Feature';
import { StyleFunction } from 'ol/style/Style';
export interface Source {
    url: string;
    format: string;
    projection?: string;
    wmsParams?: {
        [key: string]: string | number | boolean;
    };
    wmsProjection?: string;
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
    type: string;
    source: Source;
    sources?: {
        [stage: string]: Source;
    };
    category?: string;
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
        [key: string]: Color;
    };
    scaleAttribute?: string;
    olLayers?: {
        [stage: string]: {
            layer: Layer;
            defaultStyleFn: StyleFunction;
            selectedStyleFn: StyleFunction;
            extraStyleFn: StyleFunction;
        };
    };
}
export interface Config {
    baseLayers: MapLayer[];
    topicLayers: MapLayer[];
}
export declare class CsMap {
    private config;
    baseLayers: MapLayer[];
    topicLayers: MapLayer[];
    selectInteraction: Select;
    mapFeaturesById: {
        [key: string]: Feature;
    };
    private map;
    private selectedLayer?;
    constructor(config: Config);
    on(type: string, listener: ListenerFunction): void;
    setTarget(target: string): void;
    setView(center: Coordinate, zoom: number, minZoom: number, maxZoom: number): void;
    setPopUp(popup: Overlay): void;
    getView(): View;
    extentContainsCoordinate(coordinate: Coordinate): boolean;
    featureBufferContainsCoordinate(featureId: string | number, coordinate: Coordinate): boolean;
    getCoordinateFromXY(x: number, y: number): Coordinate | undefined;
    applyDefaultStyle(featureId: string | number, layer: MapLayer): void;
    applySelectedStyle(featureId: string | number, layer: MapLayer): void;
    applyExtraStyle(featureId: string | number, layer: MapLayer): void;
    getSelectedFeatures(coordinate: Coordinate): Feature[];
    getSelectedLayer(feature: Feature, coordinate: Coordinate): MapLayer | undefined;
    getBaseLayerByName(name: string): MapLayer | undefined;
    getTopicLayerByName(name: string): MapLayer | undefined;
    buildPopup(element: HTMLElement): Overlay;
    /**
     * Show/hide layers according to their "visible" property and (optionally) their category and stage.
     * Set "category" to null to show no layers at all
     */
    syncVisibleLayers(category?: string, stage?: string): void;
    fromLonLat(coordinate: Coordinate): Coordinate;
    toLonLat(coordinate: Coordinate): Coordinate;
    dispatchSelectEvent(layer: MapLayer, selected: Feature[], coordinate: Coordinate): void;
    private addLayers;
}
export declare function getFeatureCenterpoint(feature: RenderFeature): Coordinate;
export declare function generateLayers(layersConfig: MapLayer[]): MapLayer[];
export declare function generateStyles(layers: MapLayer[]): void;
export declare function styleConfigToStyleFunction(style: LayerStyle, scale: {
    [key: string]: Color;
} | undefined, scaleAttribute: string | undefined): StyleFunction;
export declare function formatText(value: any, round: boolean): string;
export declare function getColorFromCategorizedScale(feature: FeatureLike, attribute: string, scale: {
    [key: string]: Color;
}): Color;
export declare function getColorFromGraduatedScale(feature: FeatureLike, attribute: string, scale: {
    [key: string]: Color;
}): Color;
