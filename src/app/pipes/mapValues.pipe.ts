import { Pipe, PipeTransform } from '@angular/core';
declare var log;

@Pipe({name: 'mapValues'})

export class MapValuesPipe implements PipeTransform {

  transform(value: any, args: string[]): any {
    if (!value) {
      return value;
    }
    let values = [];
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        values.push(value[key]);
      }
    }
    return values;

  }
}
