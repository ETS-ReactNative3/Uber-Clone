import React, { useEffect, useState } from "react";
import { View, TextInput } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PropTypes } from "prop-types";
import { FAB, LinearProgress } from "react-native-elements";
import { useDispatch, useSelector } from "react-redux";
import tw from "tailwind-react-native-classnames";
import { selectUserLocation } from "../features/locationSlice";
import { setOrigin, setDestination, selectDestination, selectOrigin } from "../features/navSlice";
import { textEllipsis } from "../Helper";
import { fetchPlacesApi } from "../Utils";
import AnimatedIcon from "./subcomponents/AnimatedIcon";
const _ = require("lodash");

// eslint-disable-next-line react/display-name
const SearchInput = React.forwardRef(({ handleData }, ref) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const userLocation = useSelector(selectUserLocation);
  const origin = useSelector(selectOrigin);
  const destination = useSelector(selectDestination);

  const [focusedInput, setFocusedInput] = useState((userLocation?.street && 1) || 0);
  // eslint-disable-next-line no-unused-vars
  const [inputValue_1, setInputValue_1] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [inputValue_2, setInputValue_2] = useState(null);
  const [lastValue, setLastValue] = useState(null);
  const inputRef_1 = React.useRef();
  const inputRef_2 = React.useRef();
  const route = useRoute();

  const [savedRoute, setSavedRoute] = useState(null);
  const [apiResults, setApiResults] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const userSaveRoute = route?.params?.destination; // user pick location from saved location.
    if (userSaveRoute) setDestinationFromSavedLocation(userSaveRoute);
    setInputValue_2(null);
  }, []);

  /**
   * Dispatch origin or destination to store
   * params {bool} ignoreState - flag set to ignore local state checks
   */
  React.useImperativeHandle(ref, () => ({
    setOriginDestination(item, ignoreState = false) {
      if (!apiResults && !ignoreState) return;

      // Get the current focused input field
      const inputSetter = focusedInput === 0 ? setInputValue_1 : setInputValue_2;
      // Maps current focused input value to either `nearby city's name` or `input field value`
      // ** See searchScreen - handlePress or convertToGeoFormat
      const value = ignoreState ? item?.name : item.displayString;
      // Maps Nav dispatch method to either Origin or Destination base on the focused input field
      const action = focusedInput === 0 ? setOrigin : setDestination;

      inputSetter(value); // set the current input field value

      dispatch(action(item));
      // Only move to next screen if the second input has a value
      if ((inputValue_2 || ignoreState) && origin && destination) navigation.navigate("MapScreen");
    },
  }));

  const handleTextChange = async (input) => {
    // set the current input value
    focusedInput === 0 ? setInputValue_1(input) : setInputValue_2(input);

    input = input.toLowerCase().trim(); //clean inputs
    if (input.length < 6) return;

    // Prevents recalling handlePlaceSearch when user is either backspacing
    // or results are already available from previous search
    if (lastValue && lastValue.toLowerCase().startsWith(input)) return;

    setLastValue(input);
    const debouncedAPI = _.debounce(handlePlaceSearch, 400, { maxWait: 1000 }); // debounce statement
    debouncedAPI();
  };

  const handlePlaceSearch = async (search) => {
    search = search || lastValue;
    setLoading(1);
    const api_resp = await fetchPlacesApi(search);
    if (!api_resp || api_resp.status !== 200) return;

    handleData(filterApiResult(api_resp.data.results));
    setApiResults(api_resp.data.results);
    setLoading(null);
  };
  const filterApiResult = (results) => {
    // Parse results by removing zip code for places
    if (!results) return;

    return _.map(results, (result) => {
      const displayString = result.displayString.replace(/\d{5}-?\d*/g, "").trim();
      return { ...result, displayString };
    });
  };

  const setDestinationFromSavedLocation = async (location) => {
    const api_response = await fetchPlacesApi(location);
    if (!api_response || api_response.status !== 200) return;

    dispatch(setDestination(api_response.data.results[0]));
    setSavedRoute(location);

    // reset origin if destination and origin are the same
    // must use origin and destination from store, because of the additional formatting on reducers
    if (_.isEqual(origin, destination)) dispatch(setOrigin({}));
  };
  return (
    <View style={tw`p-0`}>
      <View style={tw`flex flex-row px-4 items-center drop-shadow`}>
        <View>
          <View style={tw`${focusedInput === 1 ? "bg-gray-400" : "bg-gray-700"} rounded-full h-2 w-2`}></View>
          <View style={tw`border-gray-400 h-14 border-r w-1`}></View>
          <View style={tw`${focusedInput === 0 ? "bg-gray-400" : "bg-gray-700"}  h-2 w-2`}></View>
        </View>
        <View style={tw`flex-1`}>
          <View style={tw`flex flex-row items-center content-between ${focusedInput === 0 ? "bg-gray-100" : "bg-gray-50"}  p-2 m-2 mb-0 `}>
            <TextInput
              ref={inputRef_1}
              value={textEllipsis(inputValue_1)}
              onChangeText={handleTextChange}
              blurOnSubmit={false}
              placeholder={textEllipsis(userLocation?.street) || "Enter pickup location"}
              searchIcon={false}
              onFocus={() => setFocusedInput(0)}
              inputContainerStyle={tw` px-2`}
              style={tw`flex-1 ${focusedInput === 0 ? "bg-gray-100" : "bg-gray-50"} text-xl ${inputValue_1 ? "text-gray-600" : "italic"}`}
            />
            <AnimatedIcon isHidden={!inputValue_1} handleClearInput={() => setInputValue_1(null)} type="font-awesome" name="close" size={16} color="#c3c3c3" />
          </View>
          <View style={tw`flex flex-row items-center content-between ${focusedInput === 1 ? "bg-gray-100" : "bg-gray-50"}  p-2 m-2 mb-0 `}>
            <TextInput
              ref={inputRef_2}
              value={textEllipsis(inputValue_2)}
              onChangeText={handleTextChange}
              searchIcon={false}
              onFocus={() => setFocusedInput(1)}
              blurOnSubmit={false}
              placeholder={textEllipsis(savedRoute) || "Where to?"}
              containerStyle={tw`bg-transparent border-0`}
              inputContainerStyle={tw` px-2`}
              style={tw`flex-1 ${focusedInput === 1 ? "bg-gray-100" : "bg-gray-50"} text-xl ${inputValue_2 ? "text-gray-600" : "italic"} `}
            />
            <AnimatedIcon isHidden={!inputValue_2} handleClearInput={() => setInputValue_2(null)} type="font-awesome" name="close" size={16} color="#c3c3c3" />
          </View>
        </View>
        <FAB icon={{ name: "add", color: "#000" }} size="small" color="#f3f3f3" visible={true} />
      </View>
      <LinearProgress style={[tw`bg-gray-200`, { marginVertical: 6 }]} variant={loading ? "indeterminate" : "determinate"} color="grey" />
    </View>
  );
});

export default SearchInput;
SearchInput.propTypes = {
  handleData: PropTypes.func.isRequired,
};