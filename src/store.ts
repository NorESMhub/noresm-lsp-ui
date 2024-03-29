import React, { Dispatch, ReducerAction, ReducerState } from 'react';
import maplibre from 'maplibre-gl';

import { getSitesBounds } from './utils/sites';

export const initialState: State = {
    isLoading: false,
    modelInfo: undefined,
    sites: {
        type: 'FeatureCollection',
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.Point, SiteProps>,
    customSites: {
        type: 'FeatureCollection',
        features: []
    } as GeoJSON.FeatureCollection<GeoJSON.Point, SiteProps>,
    sitesBounds: new maplibre.LngLatBounds([-180, -90], [180, 90]),
    selectedSite: undefined,
    cases: [],
    variablesConfig: []
};

export const StoreContext = React.createContext<
    [ReducerState<typeof reducers>, Dispatch<ReducerAction<typeof reducers>>]
>([
    initialState,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}
]);

export const reducers = (state: State, action: Action): State => {
    switch (action.type) {
        case 'updateLoadingState':
            return {
                ...state,
                isLoading: action.isLoading
            };
        case 'updateModelInfo':
            return {
                ...state,
                modelInfo: action.info
            };
        case 'updateSites':
            return {
                ...state,
                sites: action.sites,
                sitesBounds: getSitesBounds([action.sites, state.customSites])
            };
        case 'updateCustomSites': {
            // Filter out the site if it already exists
            const features = state.customSites.features.filter(({ geometry }) => {
                const [lon, lat] = (geometry as GeoJSON.Point).coordinates;
                return lon !== action.site.lon && lat !== action.site.lat;
            });
            if (action.action === 'add') {
                const customSites = {
                    type: 'FeatureCollection',
                    features: features.concat({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [action.site.lon, action.site.lat]
                        },
                        properties: {}
                    } as GeoJSON.Feature<GeoJSON.Point, SiteProps>)
                } as GeoJSON.FeatureCollection<GeoJSON.Point, SiteProps>;
                return {
                    ...state,
                    customSites,
                    sitesBounds: getSitesBounds([state.sites, customSites])
                };
            }
            if (action.action === 'remove') {
                const customSites = {
                    type: 'FeatureCollection',
                    features
                } as GeoJSON.FeatureCollection<GeoJSON.Point, SiteProps>;
                return {
                    ...state,
                    customSites,
                    sitesBounds: getSitesBounds([state.sites, customSites])
                };
            }
            return state;
        }
        case 'updateSelectedSite': {
            return {
                ...state,
                selectedSite: action.site
            };
        }
        case 'updateCases': {
            const customSites = {
                type: 'FeatureCollection',
                features: action.cases.reduce((features, { site, lat, lon }) => {
                    if (!site) {
                        features.push({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [lon, lat]
                            },
                            properties: {}
                        } as GeoJSON.Feature<GeoJSON.Point, SiteProps>);
                    }
                    return features;
                }, [] as GeoJSON.Feature<GeoJSON.Point, SiteProps>[])
            } as GeoJSON.FeatureCollection<GeoJSON.Point, SiteProps>;

            return {
                ...state,
                cases: action.cases,
                customSites,
                sitesBounds: getSitesBounds([state.sites, customSites])
            };
        }
        case 'updateCase': {
            const cases = state.cases;
            if (cases) {
                const editedCaseIdx = cases.findIndex((c) => c.id === action.case.id);
                if (editedCaseIdx !== -1) {
                    return {
                        ...state,
                        cases: cases
                            .slice(0, editedCaseIdx)
                            .concat(action.case)
                            .concat(cases.slice(editedCaseIdx + 1))
                    };
                }
                return {
                    ...state,
                    cases: [...cases, action.case]
                };
            }

            // This should never happen
            console.error('No cases found');

            return {
                ...state,
                cases
            };
        }
        case 'deleteCase': {
            const cases = state.cases;
            if (cases) {
                const editedCaseIdx = cases.findIndex((c) => c.id === action.case.id);
                if (editedCaseIdx !== -1) {
                    return {
                        ...state,
                        cases: cases.slice(0, editedCaseIdx).concat(cases.slice(editedCaseIdx + 1))
                    };
                }
            }
            return state;
        }
        case 'updateVariablesConfig': {
            return {
                ...state,
                variablesConfig: action.vars
            };
        }
    }
    throw Error(`Received invalid action: ${action}`);
};
