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
import type { SessionUserDto } from './SessionUserDto';
import {
    SessionUserDtoFromJSON,
    SessionUserDtoFromJSONTyped,
    SessionUserDtoToJSON,
    SessionUserDtoToJSONTyped,
} from './SessionUserDto';

/**
 * 
 * @export
 * @interface AuthResponseDto
 */
export interface AuthResponseDto {
    /**
     * JWT Access Token
     * @type {string}
     * @memberof AuthResponseDto
     */
    token: string;
    /**
     * JWT Refresh Token
     * @type {string}
     * @memberof AuthResponseDto
     */
    refreshToken: string;
    /**
     * Access Token expiration in seconds
     * @type {number}
     * @memberof AuthResponseDto
     */
    expiresIn: number;
    /**
     * User session information
     * @type {SessionUserDto}
     * @memberof AuthResponseDto
     */
    user: SessionUserDto;
}

/**
 * Check if a given object implements the AuthResponseDto interface.
 */
export function instanceOfAuthResponseDto(value: object): value is AuthResponseDto {
    if (!('token' in value) || value['token'] === undefined) return false;
    if (!('refreshToken' in value) || value['refreshToken'] === undefined) return false;
    if (!('expiresIn' in value) || value['expiresIn'] === undefined) return false;
    if (!('user' in value) || value['user'] === undefined) return false;
    return true;
}

export function AuthResponseDtoFromJSON(json: any): AuthResponseDto {
    return AuthResponseDtoFromJSONTyped(json, false);
}

export function AuthResponseDtoFromJSONTyped(json: any, ignoreDiscriminator: boolean): AuthResponseDto {
    if (json == null) {
        return json;
    }
    return {
        
        'token': json['token'],
        'refreshToken': json['refreshToken'],
        'expiresIn': json['expiresIn'],
        'user': SessionUserDtoFromJSON(json['user']),
    };
}

export function AuthResponseDtoToJSON(json: any): AuthResponseDto {
    return AuthResponseDtoToJSONTyped(json, false);
}

export function AuthResponseDtoToJSONTyped(value?: AuthResponseDto | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'token': value['token'],
        'refreshToken': value['refreshToken'],
        'expiresIn': value['expiresIn'],
        'user': SessionUserDtoToJSON(value['user']),
    };
}

