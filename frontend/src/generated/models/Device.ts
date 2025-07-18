/* tslint:disable */
/* eslint-disable */
/**
 * Tempmon API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 3.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface Device
 */
export interface Device {
    /**
     * 
     * @type {string}
     * @memberof Device
     */
    macAddress: string;
    /**
     * 
     * @type {string}
     * @memberof Device
     */
    name: string;
}

/**
 * Check if a given object implements the Device interface.
 */
export function instanceOfDevice(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "macAddress" in value;
    isInstance = isInstance && "name" in value;

    return isInstance;
}

export function DeviceFromJSON(json: any): Device {
    return DeviceFromJSONTyped(json, false);
}

export function DeviceFromJSONTyped(json: any, ignoreDiscriminator: boolean): Device {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'macAddress': json['macAddress'],
        'name': json['name'],
    };
}

export function DeviceToJSON(value?: Device | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'macAddress': value.macAddress,
        'name': value.name,
    };
}

