import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';

@Injectable()
export class GeoIpService {
    lookup(ip: string) {
        const geo = geoip.lookup(ip);
        if (!geo) {
            return null;
        }
        return {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            ll: geo.ll,
        };
    }
}
