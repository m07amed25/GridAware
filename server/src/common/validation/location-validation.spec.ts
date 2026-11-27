import { describe, expect, it } from 'vitest';
import {
  formatGrossAreaSqM,
  isValidIanaTimeZone,
  LocationCodeSchema,
  LocationCountryCodeSchema,
  LocationDescriptionSchema,
  LocationFloorCountSchema,
  LocationGrossAreaSchema,
  LocationNameSchema,
  LocationOptionalLineSchema,
  LocationPostalCodeSchema,
  LocationTimeZoneSchema,
  validateCoordinatePair,
} from './location-validation.js';

describe('location-validation', () => {
  describe('LocationCodeSchema', () => {
    it('trims whitespace and normalizes ASCII code to uppercase', () => {
      expect(LocationCodeSchema.parse('  cai-plant-01  ')).toBe('CAI-PLANT-01');
      expect(LocationCodeSchema.parse('a1')).toBe('A1');
      expect(LocationCodeSchema.parse('B-01-Z')).toBe('B-01-Z');
    });

    it('rejects internal spaces without silent hyphen rewriting', () => {
      expect(LocationCodeSchema.safeParse('CAI PLANT 01').success).toBe(false);
    });

    it('rejects leading, trailing, or consecutive hyphens, short/long lengths, and invalid characters', () => {
      expect(LocationCodeSchema.safeParse('-CAI').success).toBe(false);
      expect(LocationCodeSchema.safeParse('CAI-').success).toBe(false);
      expect(LocationCodeSchema.safeParse('CAI--01').success).toBe(false);
      expect(LocationCodeSchema.safeParse('A').success).toBe(false);
      expect(LocationCodeSchema.safeParse('A'.repeat(33)).success).toBe(false);
      expect(LocationCodeSchema.safeParse('CAI_01').success).toBe(false);
      expect(LocationCodeSchema.safeParse('القاهرة').success).toBe(false);
    });
  });

  describe('LocationNameSchema', () => {
    it('trims edges and preserves Unicode capitalization', () => {
      expect(LocationNameSchema.parse('  Cairo Manufacturing Plant  ')).toBe(
        'Cairo Manufacturing Plant',
      );
      expect(LocationNameSchema.parse('  مصنع القاهرة الصناعي  ')).toBe(
        'مصنع القاهرة الصناعي',
      );
      expect(LocationNameSchema.parse('Bâtiment Nord Étage 2')).toBe(
        'Bâtiment Nord Étage 2',
      );
    });

    it('rejects empty/short/long names and control characters', () => {
      expect(LocationNameSchema.safeParse('   ').success).toBe(false);
      expect(LocationNameSchema.safeParse('A').success).toBe(false);
      expect(LocationNameSchema.safeParse('A'.repeat(121)).success).toBe(false);
      expect(LocationNameSchema.safeParse('Plant\u0000One').success).toBe(
        false,
      );
      expect(LocationNameSchema.safeParse('Plant\nOne').success).toBe(false);
      expect(LocationNameSchema.safeParse('Plant\u007FOne').success).toBe(
        false,
      );
    });
  });

  describe('LocationDescriptionSchema & address text', () => {
    it('allows multiline descriptions with newlines/tabs and rejects other control chars', () => {
      expect(LocationDescriptionSchema.parse('  Line 1\n\tLine 2  ')).toBe(
        'Line 1\n\tLine 2',
      );
      expect(LocationDescriptionSchema.parse(null)).toBeNull();
      expect(LocationDescriptionSchema.parse('   ')).toBeNull();
      expect(LocationDescriptionSchema.safeParse('Bad\u0007bell').success).toBe(
        false,
      );
      expect(
        LocationDescriptionSchema.safeParse('x'.repeat(2001)).success,
      ).toBe(false);
    });

    it('validates optional address lines and postal code bounds', () => {
      expect(LocationOptionalLineSchema.parse('  12 Industrial Rd  ')).toBe(
        '12 Industrial Rd',
      );
      expect(LocationOptionalLineSchema.parse('   ')).toBeNull();
      expect(
        LocationOptionalLineSchema.safeParse('x'.repeat(201)).success,
      ).toBe(false);
      expect(LocationOptionalLineSchema.safeParse('Bad\nLine').success).toBe(
        false,
      );
      expect(LocationPostalCodeSchema.parse('  11835  ')).toBe('11835');
      expect(LocationPostalCodeSchema.safeParse('x'.repeat(33)).success).toBe(
        false,
      );
    });
  });

  describe('LocationTimeZoneSchema & isValidIanaTimeZone', () => {
    it('accepts canonical IANA time zones including UTC', () => {
      expect(isValidIanaTimeZone('UTC')).toBe(true);
      expect(isValidIanaTimeZone('Africa/Cairo')).toBe(true);
      expect(isValidIanaTimeZone('Europe/London')).toBe(true);
      expect(LocationTimeZoneSchema.parse('  Africa/Cairo  ')).toBe(
        'Africa/Cairo',
      );
    });

    it('rejects fixed numeric offsets and unknown identifiers', () => {
      expect(isValidIanaTimeZone('+02:00')).toBe(false);
      expect(isValidIanaTimeZone('UTC+2')).toBe(false);
      expect(isValidIanaTimeZone('GMT+02:00')).toBe(false);
      expect(isValidIanaTimeZone('Mars/Olympus')).toBe(false);
      expect(LocationTimeZoneSchema.safeParse('+02:00').success).toBe(false);
      expect(LocationTimeZoneSchema.safeParse('').success).toBe(false);
    });
  });

  describe('LocationCountryCodeSchema', () => {
    it('normalizes trimmed ISO alpha-2 country codes to uppercase', () => {
      expect(LocationCountryCodeSchema.parse(' eg ')).toBe('EG');
      expect(LocationCountryCodeSchema.parse('US')).toBe('US');
      expect(LocationCountryCodeSchema.parse(null)).toBeNull();
      expect(LocationCountryCodeSchema.parse('  ')).toBeNull();
    });

    it('rejects non-alpha-2 codes', () => {
      expect(LocationCountryCodeSchema.safeParse('EGY').success).toBe(false);
      expect(LocationCountryCodeSchema.safeParse('E1').success).toBe(false);
      expect(LocationCountryCodeSchema.safeParse('E').success).toBe(false);
    });
  });

  describe('validateCoordinatePair', () => {
    it('accepts both null/omitted or both finite in-range numbers', () => {
      expect(validateCoordinatePair(undefined, undefined)).toEqual([]);
      expect(validateCoordinatePair(null, null)).toEqual([]);
      expect(validateCoordinatePair(30.0444, 31.2357)).toEqual([]);
      expect(validateCoordinatePair(-90, -180)).toEqual([]);
      expect(validateCoordinatePair(90, 180)).toEqual([]);
    });

    it('rejects partial pairs and out-of-range or non-finite values', () => {
      expect(validateCoordinatePair(30.0444, null).length).toBeGreaterThan(0);
      expect(validateCoordinatePair(null, 31.2357).length).toBeGreaterThan(0);
      expect(validateCoordinatePair(90.01, 31.0).length).toBeGreaterThan(0);
      expect(validateCoordinatePair(30.0, 180.01).length).toBeGreaterThan(0);
      expect(validateCoordinatePair(Number.NaN, 31.0).length).toBeGreaterThan(
        0,
      );
      expect(
        validateCoordinatePair(30.0, Number.POSITIVE_INFINITY).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('LocationFloorCountSchema', () => {
    it('accepts integers 1..200 and null', () => {
      expect(LocationFloorCountSchema.parse(1)).toBe(1);
      expect(LocationFloorCountSchema.parse(200)).toBe(200);
      expect(LocationFloorCountSchema.parse(null)).toBeNull();
    });

    it('rejects 0, negative, decimals, and >200', () => {
      expect(LocationFloorCountSchema.safeParse(0).success).toBe(false);
      expect(LocationFloorCountSchema.safeParse(-2).success).toBe(false);
      expect(LocationFloorCountSchema.safeParse(2.5).success).toBe(false);
      expect(LocationFloorCountSchema.safeParse(201).success).toBe(false);
    });
  });

  describe('LocationGrossAreaSchema & formatGrossAreaSqM', () => {
    it('accepts positive decimal strings up to 2 decimal places and normalizes to 2 places', () => {
      expect(LocationGrossAreaSchema.parse('4200')).toBe('4200.00');
      expect(LocationGrossAreaSchema.parse('4200.5')).toBe('4200.50');
      expect(LocationGrossAreaSchema.parse(' 0.25 ')).toBe('0.25');
      expect(LocationGrossAreaSchema.parse('9999999999.99')).toBe(
        '9999999999.99',
      );
      expect(LocationGrossAreaSchema.parse(null)).toBeNull();
    });

    it('rejects numbers, zero, negatives, >2 decimals, and overflow', () => {
      expect(LocationGrossAreaSchema.safeParse(4200).success).toBe(false);
      expect(LocationGrossAreaSchema.safeParse('0').success).toBe(false);
      expect(LocationGrossAreaSchema.safeParse('0.00').success).toBe(false);
      expect(LocationGrossAreaSchema.safeParse('-10.00').success).toBe(false);
      expect(LocationGrossAreaSchema.safeParse('12.345').success).toBe(false);
      expect(LocationGrossAreaSchema.safeParse('10000000000.00').success).toBe(
        false,
      );
      expect(LocationGrossAreaSchema.safeParse('abc').success).toBe(false);
    });

    it('formats Prisma Decimal-like objects and strings to 2 fixed decimal places', () => {
      expect(formatGrossAreaSqM(null)).toBeNull();
      expect(formatGrossAreaSqM(undefined)).toBeNull();
      expect(formatGrossAreaSqM('4200')).toBe('4200.00');
      expect(formatGrossAreaSqM({ toString: () => '123.4' })).toBe('123.40');
    });
  });
});
