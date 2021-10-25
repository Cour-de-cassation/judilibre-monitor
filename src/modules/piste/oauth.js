require('../env');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const piste_oauth_body = (key, secret) => {
    const params = new URLSearchParams();
    params.append('grant_type','client_credentials');
    params.append('client_id',key);
    params.append('client_secret',secret);
    params.append('scope','openid');
    return params;
}

const piste_oauth = {
    recette: {
        url: "https://sandbox-oauth.piste.gouv.fr/api/oauth/token",
        body: piste_oauth_body(process.env.PISTE_METRICS_KEY, process.env.PISTE_METRICS_SECRET)
    },
    production: {
        url: "https://oauth.piste.gouv.fr/api/oauth/token",
        body: piste_oauth_body(process.env.PISTE_METRICS_KEY_PROD, process.env.PISTE_METRICS_SECRET_PROD)
    }
};

const checkToken = async (env) => {
    try {
        if (piste_oauth[env].token && piste_oauth[env].expiration && (new Date(Date.now()) < piste_oauth[env].expiration)) {
            return piste_oauth[env].token;
        } else {
            await getToken(env);
            return piste_oauth[env].token;
        }
    } catch(e) {
        console.log('checkToken',piste_oauth[env], env, e.message);
        throw(e);
    }
}

const getToken = async (env) => {
    let response, json;
    try {
        response = await fetch(piste_oauth[env].url, {
            method: 'POST',
            body: piste_oauth[env].body
        });
        if (response.status !== 200) {
            throw({message: `Status: ${response.status}}`})
        }
        json = await response.json();
        piste_oauth[env].token = json.access_token;
        // set expiration 10s before official expiration, avoiding limit requests.
        piste_oauth[env].expiration = new Date(Date.now() + 2 * (json.expires_in * 1000 - 10000));
    } catch (e) {
        console.log('getToken', env, response, json, e.message);
        throw(e);
    }
}

module.exports = checkToken ;


