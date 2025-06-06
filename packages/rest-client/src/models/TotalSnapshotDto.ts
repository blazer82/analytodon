/* tslint:disable */
/* eslint-disable */
/**
 * Analytodon API
 * This is the API documentation for Analytodon - the open-source Mastodon analytics tool.
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface TotalSnapshotDto
 */
export interface TotalSnapshotDto {
    /**
     * Total cumulative count of boosts
     * @type {number}
     * @memberof TotalSnapshotDto
     */
    amount: number;
    /**
     * Date of the last data entry
     * @type {Date}
     * @memberof TotalSnapshotDto
     */
    day: Date;
}

/**
 * Check if a given object implements the TotalSnapshotDto interface.
 */
export function instanceOfTotalSnapshotDto(value: object): value is TotalSnapshotDto {
    if (!('amount' in value) || value['amount'] === undefined) return false;
    if (!('day' in value) || value['day'] === undefined) return false;
    return true;
}

export function TotalSnapshotDtoFromJSON(json: any): TotalSnapshotDto {
    return TotalSnapshotDtoFromJSONTyped(json, false);
}

export function TotalSnapshotDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): TotalSnapshotDto {
    if (json == null) {
        return json;
    }
    return {
        
        'amount': json['amount'],
        'day': (new Date(json['day'])),
    };
}

export function TotalSnapshotDtoToJSON(json: any): TotalSnapshotDto {
    return TotalSnapshotDtoToJSONTyped(json, false);
}

export function TotalSnapshotDtoToJSONTyped(value?: TotalSnapshotDto | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'amount': value['amount'],
        'day': ((value['day']).toISOString()),
    };
}

