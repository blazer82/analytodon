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
 * @interface FollowersKpiDto
 */
export interface FollowersKpiDto {
    /**
     * Followers gained/lost in the current period
     * @type {number}
     * @memberof FollowersKpiDto
     */
    currentPeriod?: number;
    /**
     * Progress through the current period (0 to 1)
     * @type {number}
     * @memberof FollowersKpiDto
     */
    currentPeriodProgress?: number;
    /**
     * Followers gained/lost in the previous period
     * @type {number}
     * @memberof FollowersKpiDto
     */
    previousPeriod?: number;
    /**
     * Indicates if the current period is the full last period
     * @type {boolean}
     * @memberof FollowersKpiDto
     */
    isLastPeriod?: boolean;
    /**
     * Trend compared to the previous period
     * @type {number}
     * @memberof FollowersKpiDto
     */
    trend?: number;
}

/**
 * Check if a given object implements the FollowersKpiDto interface.
 */
export function instanceOfFollowersKpiDto(value: object): value is FollowersKpiDto {
    return true;
}

export function FollowersKpiDtoFromJSON(json: any): FollowersKpiDto {
    return FollowersKpiDtoFromJSONTyped(json, false);
}

export function FollowersKpiDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): FollowersKpiDto {
    if (json == null) {
        return json;
    }
    return {
        
        'currentPeriod': json['currentPeriod'] == null ? undefined : json['currentPeriod'],
        'currentPeriodProgress': json['currentPeriodProgress'] == null ? undefined : json['currentPeriodProgress'],
        'previousPeriod': json['previousPeriod'] == null ? undefined : json['previousPeriod'],
        'isLastPeriod': json['isLastPeriod'] == null ? undefined : json['isLastPeriod'],
        'trend': json['trend'] == null ? undefined : json['trend'],
    };
}

export function FollowersKpiDtoToJSON(json: any): FollowersKpiDto {
    return FollowersKpiDtoToJSONTyped(json, false);
}

export function FollowersKpiDtoToJSONTyped(value?: FollowersKpiDto | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'currentPeriod': value['currentPeriod'],
        'currentPeriodProgress': value['currentPeriodProgress'],
        'previousPeriod': value['previousPeriod'],
        'isLastPeriod': value['isLastPeriod'],
        'trend': value['trend'],
    };
}

