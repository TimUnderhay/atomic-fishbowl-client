import { Pipe, PipeTransform } from '@angular/core';
import { Logger } from 'loglevel';
declare var log: Logger;

@Pipe({name: 'allCaps'})

export class AllCapsPipe implements PipeTransform {

  transform(value: string, args: string): any {
    return value.toUpperCase();
  }
}
