import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { User } from './user';
import { ToolService } from './tool.service';
import { DataService } from './data.service';
import * as log from 'loglevel';

@Injectable()

export class AuthenticationService {

  constructor(  private dataService: DataService,
                private router: Router,
                private http: HttpClient,
                private toolService: ToolService ) {
                  this.toolService.logout.subscribe( () => this.logout() );
                }

  public loggedInChanged: Subject<boolean> = new Subject<boolean>();
  private apiUrl = '/api';
  public loggedInUser: User;
  public sessionId: number;

  public logout(): void {
    log.debug('AuthenticationService: logout(): logging out');
    this.dataService.abortGetBuildingCollection();
    this.http.get(this.apiUrl + '/logout' )
                    .toPromise()
                    .then( () => {} )
                    .catch( (err) => { log.error('AuthenticationService: logout(): ERROR during logout'); });

    this.loggedInUser = null;
    this.loggedInChanged.next(false);
    this.router.navigate(['login']);
  }

  getUsers(): Promise<User> {
    return this.http
                .get(this.apiUrl + '/users' )
                .toPromise()
                // .then(response => response.json() as User[] )
                .then(response => response as User[] )
                .catch(e => this.handleError(e));
  }

  getUser(userName: string): Promise<User> {
    return this.http.get(this.apiUrl + '/user/' + userName )
                    .toPromise()
                    /*.then( response => {
                      let user = response.json();
                      return user;
                    });*/
                    .then ( response => response as User );
  }

  isLoggedIn(): Promise<boolean> {
    return this.http.get(this.apiUrl + '/isloggedin' )
                    .toPromise()
                    .then( (response: any) => {
                      // let res = response.json();
                      let res = response;
                      this.loggedInUser = res.user;
                      this.sessionId = res.sessionId;
                      this.toolService.sessionId.next(this.sessionId);
                      return true;
                    })
                    .catch( () => false ); // check that this tslint-suggested change is kosher
  }

  public login(u: User): Promise<boolean> {
    // let headers = new Headers({ 'Content-Type': 'application/json' });
    // let options = new RequestOptions({ headers: headers });
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    let user: User = { username: u.username, password: u.password};
    // return this.http.post(this.apiUrl + '/login', user, options)
    return this.http.post(this.apiUrl + '/login', user, { headers } )
                    .toPromise()
                    .then( (response: any) => {
                      // let res = response.json();
                      let res = response;
                      log.debug('AuthenticationService: login(): Got login response:', res);
                      this.loggedInUser = res.user;
                      this.sessionId = res.sessionId;
                      this.toolService.sessionId.next(this.sessionId);
                      this.loggedInChanged.next(true);
                      this.dataService.init();
                      this.router.navigate(['/']);
                      return true;
                    })
                    .catch( (e: any) => {
                      if (e.status === 401) {
                        this.loggedInChanged.next(false);
                        return false;
                      }
                    });
  }

  checkCredentials(): void {
    this.isLoggedIn()
        .then( (res) => {
          if (res === false) {
            this.loggedInChanged.next(false);
            this.router.navigate(['login']);
          }
          else {
            this.loggedInChanged.next(true);
            this.dataService.init();
          }
        });
  }

  handleError(error: any): Promise<any> {
    log.error('ERROR: ', error);
    return Promise.reject(error.message || error);
  }

}
