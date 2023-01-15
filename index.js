require('dotenv').config()
const core = require('@actions/core')

async function getDistance(res){
    const stats_link = `https://www.strava.com/api/v3/athletes/49030731/stats?access_token=${res.access_token}`
    const response = await fetch(stats_link)
    const stats = await response.json()

    const km_to_mile_factor = 0.621371
    const distance_miles = Math.round((stats.ytd_run_totals.distance * km_to_mile_factor) / 1000)
    console.log(distance_miles)
    return distance_miles
}

async function reAuthorize(){
    const auth_link = 'https://www.strava.com/api/v3/oauth/token'

    
    const response = await fetch(auth_link,{
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        
        body: JSON.stringify({
            client_id: '99458',
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token: process.env.STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        })
    })
    const auth = await response.json()
    return auth
}

async function logDistance() {
    const auth = await reAuthorize()
    const distance = await getDistance(auth)
    
    // 
    core.setOutput('TOTAL_MILES', `{"total_miles": ${distance}}`)
}

logDistance()