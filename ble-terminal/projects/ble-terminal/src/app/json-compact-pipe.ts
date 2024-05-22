import { Pipe, PipeTransform } from '@angular/core';

declare type Tok = {
  '{': string,
  '[': string,
  '}': string,
  ']': string,
  ',': string,
  ':': string
}

@Pipe({
  name: 'jsonCompact'
})

export class JsonCompactPipe implements PipeTransform {

  // Note: This regex matches even invalid JSON strings, but since we�re
  // working on the output of `JSON.stringify` we know that only valid strings
  // are present (unless the user supplied a weird `options.indent` but in
  // that case we don�t care since the output would be invalid anyway).
  stringOrChar = /("(?:[^\\"]|\\.)*")|[:,\][}{]/g;
  indent!: string;
  addMargin: any;
  maxLength!: number;
  nextIndent: any;

  transform(value: any, args?: any): any {
    return this.stringify(value, { maxLength: 80 });
  }

  prettify(str: string, addMargin: any): string {
    const m = addMargin ? ' ' : '';
    const tokens: Tok = {
      '{': '{' + m,
      '[': '[' + m,
      '}': m + '}',
      ']': m + ']',
      ',': ', ',
      ':': ': '
    };
    return str.replace(this.stringOrChar, function (match, s) {
      return s ? match : tokens[match as keyof Tok];
    });
  }

  comma(array: string | any[], index: number) {
    return (index === array.length - 1 ? 0 : 1);
  }

  get(options: { [x: string]: any; }, name: string, defaultValue: number | boolean) {
    return (name in options ? options[name] : defaultValue);
  }

  _stringify(o: any[] | null, currentIndent: string | any[], reserved: number): string {
    const s = JSON.stringify(o);

    if (s === undefined) {
      return s;
    }

    const length = this.maxLength - currentIndent.length - reserved;

    if (s.length <= length) {
      const prettified = this.prettify(s, this.addMargin);
      if (prettified.length <= length) {
        return prettified;
      }
    }

    if (typeof o === 'object' && o !== null) {
      const nextIndent = currentIndent + this.indent;
      const items = [];
      let delimiters;


      if (Array.isArray(o)) {
        for (let index = 0; index < o.length; index++) {
          items.push(
            this._stringify(o[index], nextIndent, this.comma(o, index)) || 'null'
          );
        }
        delimiters = '[]';
      } else {
        const array = Object.keys(o);
        for (let index = 0; index < array.length; index++) {
          const key = array[index];
          const keyPart = JSON.stringify(key) + ': ';
          const value = this._stringify(o[key], nextIndent, keyPart.length + this.comma(array, index));
          if (value !== undefined) {
            items.push(keyPart + value);
          }
        }

        delimiters = '{}';
      }

      if (items.length > 0) {
        return [
          delimiters[0],
          this.indent + items.join(',\r\n' + nextIndent),
          delimiters[1]
        ].join('\r\n' + currentIndent);
      }
    }
    return s;
  }

  stringify(obj: any, options: { maxLength?: number; }): string {
    options = options || {};
    this.indent = JSON.stringify([1], null, this.get(options, 'indent', 2)).slice(2, -3);
    this.addMargin = this.get(options, 'margins', false);
    this.maxLength = (this.indent === '' ? Infinity : this.get(options, 'maxLength', 80));
    return (this._stringify(obj, '', 0));
  }
}

