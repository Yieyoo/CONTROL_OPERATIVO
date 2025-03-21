var simplemaps_countrymap_mapdata = {
  main_settings: {
    //General settings
    width: "responsive", //'700' or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#ffffff",
    
    //State defaults
    state_description: "State description",
    state_color: "#691932",
    state_hover_color: "#3B729F",
    state_url: "",
    border_size: 1.5,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
    //Location defaults
    location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 2,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
    //Label defaults
    label_color: "#ffffff",
    label_hover_color: "#ffffff",
    label_size: 16,
    label_font: "Arial",
    label_display: "auto",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
    //Zoom settings
    zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
    //Popup settings
    popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
    //Advanced settings
    div: "map",
    auto_load: "yes",
    url_new_tab: "no", // Abrir enlaces en una nueva pestaña
    images_directory: "default",
    fade_time: 0.1, 
    link_text: "View Website",
    popups: "detect",
    state_image_url: "",
    state_image_position: "",
    location_image_url: ""
  },
  state_specific: {
    MXAGU: {
      name: "Aguascalientes",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Aguascalientes" // URL de redirección
    },
    MXBCN: {
      name: "Baja California",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Baja_California" // URL de redirección
    },
    MXBCS: {
      name: "Baja California Sur",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Baja_California_Sur" // URL de redirección
    },
    MXCAM: {
      name: "Campeche",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Campeche" // URL de redirección
    },
    MXCHH: {
      name: "Chihuahua",
      description: " ",
      url: "../../estados/chihuahua/chihuahua" // URL de redirección
    },
    MXCHP: {
      name: "Chiapas",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Chiapas" // URL de redirección
    },
    MXCMX: {
      name: "Ciudad de México",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Ciudad_de_M%C3%A9xico" // URL de redirección
    },
    MXCOA: {
      name: "Coahuila",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Coahuila" // URL de redirección
    },
    MXCOL: {
      name: "Colima",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Colima" // URL de redirección
    },
    MXDUR: {
      name: "Durango",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Durango" // URL de redirección
    },
    MXGRO: {
      name: "Guerrero",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Guerrero" // URL de redirección
    },
    MXGUA: {
      name: "Guanajuato",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Guanajuato" // URL de redirección
    },
    MXHID: {
      name: "Hidalgo",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Hidalgo" // URL de redirección
    },
    MXJAL: {
      name: "Jalisco",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Jalisco" // URL de redirección
    },
    MXMEX: {
      name: "México",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Estado_de_M%C3%A9xico" // URL de redirección
    },
    MXMIC: {
      name: "Michoacán",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Michoac%C3%A1n" // URL de redirección
    },
    MXMOR: {
      name: "Morelos",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Morelos" // URL de redirección
    },
    MXNAY: {
      name: "Nayarit",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Nayarit" // URL de redirección
    },
    MXNLE: {
      name: "Nuevo León",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Nuevo_Le%C3%B3n" // URL de redirección
    },
    MXOAX: {
      name: "Oaxaca",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Oaxaca" // URL de redirección
    },
    MXPUE: {
      name: "Puebla",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Puebla" // URL de redirección
    },
    MXQUE: {
      name: "Querétaro",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Quer%C3%A9taro" // URL de redirección
    },
    MXROO: {
      name: "Quintana Roo",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Quintana_Roo" // URL de redirección
    },
    MXSIN: {
      name: "Sinaloa",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Sinaloa" // URL de redirección
    },
    MXSLP: {
      name: "San Luis Potosí",
      description: " ",
      url: "https://es.wikipedia.org/wiki/San_Luis_Potos%C3%AD" // URL de redirección
    },
    MXSON: {
      name: "Sonora",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Sonora" // URL de redirección
    },
    MXTAB: {
      name: "Tabasco",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Tabasco" // URL de redirección
    },
    MXTAM: {
      name: "Tamaulipas",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Tamaulipas" // URL de redirección
    },
    MXTLA: {
      name: "Tlaxcala",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Tlaxcala" // URL de redirección
    },
    MXVER: {
      name: "Veracruz",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Veracruz" // URL de redirección
    },
    MXYUC: {
      name: "Yucatán",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Yucat%C3%A1n" // URL de redirección
    },
    MXZAC: {
      name: "Zacatecas",
      description: " ",
      url: "https://es.wikipedia.org/wiki/Zacatecas" // URL de redirección
    }
  },
  locations: {},
  labels: {
    MXAGU: {
      name: "Aguascalientes",
      parent_id: "MXAGU"
    },
    MXBCN: {
      name: "Baja California",
      parent_id: "MXBCN"
    },
    MXBCS: {
      name: "Baja California Sur",
      parent_id: "MXBCS"
    },
    MXCAM: {
      name: "Campeche",
      parent_id: "MXCAM"
    },
    MXCHH: {
      name: "Chihuahua",
      parent_id: "MXCHH"
    },
    MXCHP: {
      name: "Chiapas",
      parent_id: "MXCHP"
    },
    MXCMX: {
      name: "Ciudad de México",
      parent_id: "MXCMX"
    },
    MXCOA: {
      name: "Coahuila",
      parent_id: "MXCOA"
    },
    MXCOL: {
      name: "Colima",
      parent_id: "MXCOL"
    },
    MXDUR: {
      name: "Durango",
      parent_id: "MXDUR"
    },
    MXGRO: {
      name: "Guerrero",
      parent_id: "MXGRO"
    },
    MXGUA: {
      name: "Guanajuato",
      parent_id: "MXGUA"
    },
    MXHID: {
      name: "Hidalgo",
      parent_id: "MXHID"
    },
    MXJAL: {
      name: "Jalisco",
      parent_id: "MXJAL"
    },
    MXMEX: {
      name: "México",
      parent_id: "MXMEX"
    },
    MXMIC: {
      name: "Michoacán",
      parent_id: "MXMIC"
    },
    MXMOR: {
      name: "Morelos",
      parent_id: "MXMOR"
    },
    MXNAY: {
      name: "Nayarit",
      parent_id: "MXNAY"
    },
    MXNLE: {
      name: "Nuevo León",
      parent_id: "MXNLE"
    },
    MXOAX: {
      name: "Oaxaca",
      parent_id: "MXOAX"
    },
    MXPUE: {
      name: "Puebla",
      parent_id: "MXPUE"
    },
    MXQUE: {
      name: "Querétaro",
      parent_id: "MXQUE"
    },
    MXROO: {
      name: "Quintana Roo",
      parent_id: "MXROO"
    },
    MXSIN: {
      name: "Sinaloa",
      parent_id: "MXSIN"
    },
    MXSLP: {
      name: "San Luis Potosí",
      parent_id: "MXSLP"
    },
    MXSON: {
      name: "Sonora",
      parent_id: "MXSON"
    },
    MXTAB: {
      name: "Tabasco",
      parent_id: "MXTAB"
    },
    MXTAM: {
      name: "Tamaulipas",
      parent_id: "MXTAM"
    },
    MXTLA: {
      name: "Tlaxcala",
      parent_id: "MXTLA"
    },
    MXVER: {
      name: "Veracruz",
      parent_id: "MXVER"
    },
    MXYUC: {
      name: "Yucatán",
      parent_id: "MXYUC"
    },
    MXZAC: {
      name: "Zacatecas",
      parent_id: "MXZAC"
    }
  },
  legend: {
    entries: []
  },
  regions: {}
};