import proto from "../proto";
import POGOProtos from "pokemongo-protobuf";

import CFG from "../../cfg";

/**
 * @return {Buffer}
 */
export default function DownloadSettings() {

  let buffer = ({
    hash: "2788184af4004004d6ab0740f7632983332106f6",
    settings: {
      fort_settings: {
        "interaction_range_meters": 40.25098039215686,
        "max_total_deployed_pokemon": 10,
        "max_player_deployed_pokemon": 1,
        "deploy_stamina_multiplier": 8.062745098039215,
        "deploy_attack_multiplier": 0,
        "far_interaction_range_meters": 1000.0156862745098
      },
      map_settings: {
        "pokemon_visible_range": 70.00196078431372,
        "poke_nav_range_meters": 751.0156862745098,
        "encounter_range_meters": 50.25098039215686,
        "get_map_objects_min_refresh_seconds": 10.007843017578125,
        "get_map_objects_max_refresh_seconds": 11.01568603515625,
        "get_map_objects_min_distance_meters": 10.007843017578125,
        "google_maps_api_key": CFG.GMAPS_KEY
      },
      inventory_settings: {
       "max_pokemon": 1000,
        "max_bag_items": 1000,
        "base_pokemon": 250,
        "base_bag_items": 350,
        "base_eggs": 9
      },
      minimum_client_version: CFG.MINIMUM_CLIENT_VERSION
    }
  })

  return POGOProtos.serialize(buffer, "POGOProtos.Networking.Responses.DownloadSettingsResponse");

}