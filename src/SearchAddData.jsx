// Component for adding or replacing field data across multiple documents
import { Stack, Card, Grid, Heading, Text, Button, TextInput, Select, TextArea, Radio } from '@sanity/ui'
import { EditIcon, CollapseIcon, ExpandIcon, LockIcon, UnlockIcon } from '@sanity/icons'
import { useState, useEffect } from 'react'
import DangerModeWarning, { shouldShowDangerWarning } from './DangerModeWarning'

/**
 * Search and Add Data Component
 * Allows adding or replacing field data across multiple documents
 * @param {Object} props - Component props
 * @param {SanityClient} props.client - Sanity client instance
 */
const SearchAddData = (props) => {
	const {client, icon: Icon, displayName, dangerMode, utilityId, onDangerModeChange} = props;
	const [searchAddDataValue, setSearchAddDataValue] = useState('');
	const [searchAddDataType, setSearchAddDataType] = useState('typeface');
	const [searchAddDataField, setSearchAddDataField] = useState('');
	const [addableData, setAddableData] = useState('');
	const [searchAddData, setSearchAddData] = useState([]);
	const [searchAddDataMessage, setSearchAddDataMessage] = useState('');
	const [addableDataFormatted, setAddableDataFormatted] = useState('');
	const [canEval, setCanEval] = useState(false);
	const [excludeValue, setExcludeValue] = useState('');
	const [exclude, setExclude] = useState(false);
	const [replaceMode, setReplaceMode] = useState('full'); // 'full', 'partial', 'prepend', 'append', 'transform'
	const [findText, setFindText] = useState('');
	const [replaceText, setReplaceText] = useState('');
	const [transformType, setTransformType] = useState('trim'); // 'trim', 'uppercase', 'lowercase', 'capitalize', 'toNumber', 'toBoolean', 'toArray', 'toString'
	const [showWarningModal, setShowWarningModal] = useState(false);

	/**
	 * Handle danger mode toggle with warning modal
	 */
	const handleDangerModeToggle = () => {
		if (!dangerMode && shouldShowDangerWarning()) {
			// Trying to enable danger mode, show warning
			setShowWarningModal(true);
		} else {
			// Either disabling danger mode or warning is suppressed
			onDangerModeChange(utilityId, !dangerMode);
		}
	};

	const handleWarningConfirm = () => {
		setShowWarningModal(false);
		onDangerModeChange(utilityId, true);
	};

	const handleWarningCancel = () => {
		setShowWarningModal(false);
	};

	async function searchForItems() {
		const items = searchAddDataType !== "" && searchAddDataField !== "" ?
			await client.fetch(`
				*[
					_type == "${searchAddDataType}" &&
					title match "${searchAddDataValue}*"
					${ excludeValue !== "" ? ` && !(title match "*${excludeValue}*") ` : "" }
					${ dangerMode ? "" : ` && !defined(${searchAddDataField})`}
				]
			`)
		: []
		setSearchAddData(items)
	}

	useEffect(() => {
		if (!exclude) setExcludeValue("");
	}, [exclude]);

	useEffect(() => {
		searchForItems()
	}, [searchAddDataValue, searchAddDataType, searchAddDataField, dangerMode, exclude, excludeValue])

	function sanitizeAddableData() {
		let data;
		try {
			data = eval(addableData);
		} catch (e) {
			try {
				data = eval(`(${addableData})`);
			} catch (e) {
				console.error("EVAL FAILED: ", e.message);
				data = "EVAL FAILED — Please check your syntax.";
			}
		}
		return data;
	}

	useEffect(() => {
		if (replaceMode === 'full') {
			if (searchAddDataField !== "" || addableData !== "") {
				let patch = {};
				let data = sanitizeAddableData();
				patch[searchAddDataField] = data;
				let patchString = JSON.stringify(patch);
				setAddableDataFormatted(patchString !== "{}" ? patchString : "EVAL FAILED — Please check your syntax.");
				if (patchString !== "{}" && data !== "EVAL FAILED — Please check your syntax.") setCanEval(true);
				else setCanEval(false);
			} else {
				setAddableDataFormatted("");
			}
		} else {
			setCanEval(searchAddDataField !== "");
			if (replaceMode === 'partial') {
				setAddableDataFormatted(`Replace "${findText}" with "${replaceText}" in field "${searchAddDataField}"`);
			} else if (replaceMode === 'prepend') {
				setAddableDataFormatted(`Prepend "${replaceText}" to field "${searchAddDataField}"`);
			} else if (replaceMode === 'append') {
				setAddableDataFormatted(`Append "${replaceText}" to field "${searchAddDataField}"`);
			} else if (replaceMode === 'transform') {
				setAddableDataFormatted(`Transform field "${searchAddDataField}" using: ${transformType}`);
			}
		}
	}, [addableData, searchAddDataField, replaceMode, findText, replaceText, transformType])

	async function AddNotReplaceData(){
		setSearchAddDataMessage('Updating data...');
		let updateDataCount = 0;

		for (const item of searchAddData) {
			try {
				setSearchAddDataMessage(`Updating: ${item?.title ? item.title : item._id}`);
				let patch = {};

				if (replaceMode === 'full') {
					// Original full replace mode
					patch[searchAddDataField] = sanitizeAddableData();
				} else {
					// Get current value
					let currentValue = item[searchAddDataField];

					if (typeof currentValue === 'string') {
						if (replaceMode === 'partial') {
							// Find and replace within the string
							patch[searchAddDataField] = currentValue.replaceAll(findText, replaceText);
						} else if (replaceMode === 'prepend') {
							// Add to beginning
							patch[searchAddDataField] = replaceText + currentValue;
						} else if (replaceMode === 'append') {
							// Add to end
							patch[searchAddDataField] = currentValue + replaceText;
						} else if (replaceMode === 'transform') {
							// Transform the text or convert type
							if (transformType === 'trim') {
								patch[searchAddDataField] = currentValue.trim();
							} else if (transformType === 'uppercase') {
								patch[searchAddDataField] = currentValue.toUpperCase();
							} else if (transformType === 'lowercase') {
								patch[searchAddDataField] = currentValue.toLowerCase();
							} else if (transformType === 'capitalize') {
								patch[searchAddDataField] = currentValue.charAt(0).toUpperCase() + currentValue.slice(1).toLowerCase();
							} else if (transformType === 'toNumber') {
								// Convert to number
								const num = Number(currentValue);
								patch[searchAddDataField] = isNaN(num) ? 0 : num;
							} else if (transformType === 'toBoolean') {
								// Convert to boolean (handles "true"/"false" strings, 1/0, etc)
								patch[searchAddDataField] = currentValue === true ||
									currentValue === 'true' ||
									currentValue === '1' ||
									currentValue === 1;
							} else if (transformType === 'toArray') {
								// Convert to array
								if (Array.isArray(currentValue)) {
									patch[searchAddDataField] = currentValue;
								} else if (typeof currentValue === 'string') {
									// Split by comma or keep as single item
									patch[searchAddDataField] = currentValue.includes(',')
										? currentValue.split(',').map(s => s.trim())
										: [currentValue];
								} else {
									patch[searchAddDataField] = [currentValue];
								}
							} else if (transformType === 'toString') {
								// Convert to string
								if (typeof currentValue === 'string') {
									patch[searchAddDataField] = currentValue;
								} else if (Array.isArray(currentValue)) {
									patch[searchAddDataField] = currentValue.join(', ');
								} else if (typeof currentValue === 'object' && currentValue !== null) {
									patch[searchAddDataField] = JSON.stringify(currentValue);
								} else {
									patch[searchAddDataField] = String(currentValue);
								}
							}
						}
					} else {
						// Handle non-string types for transform operations
						if (replaceMode === 'transform') {
							if (transformType === 'toNumber') {
								const num = Number(currentValue);
								patch[searchAddDataField] = isNaN(num) ? 0 : num;
							} else if (transformType === 'toBoolean') {
								patch[searchAddDataField] = Boolean(currentValue);
							} else if (transformType === 'toArray') {
								patch[searchAddDataField] = Array.isArray(currentValue) ? currentValue : [currentValue];
							} else if (transformType === 'toString') {
								if (Array.isArray(currentValue)) {
									patch[searchAddDataField] = currentValue.join(', ');
								} else if (typeof currentValue === 'object' && currentValue !== null) {
									patch[searchAddDataField] = JSON.stringify(currentValue);
								} else {
									patch[searchAddDataField] = String(currentValue);
								}
							}
						}
					}
				}

				if (dangerMode) await client.patch(item._id).set(patch).commit();
				else await client.patch(item._id).setIfMissing(patch).commit();

			} catch (e) {
				console.error(e.message)
				setSearchAddDataMessage('Error: ' + e.message);
			}
			await new Promise(r => setTimeout(r, 50));

			updateDataCount++;
			if (updateDataCount == searchAddData.length - 1) {
				setSearchAddDataMessage('All Updated!');
				searchForItems();
				setTimeout(()=>{
					setSearchAddDataMessage("");
				}, 2000)
			}
		}
	}

	return (
		<>
			<DangerModeWarning
				isOpen={showWarningModal}
				onConfirm={handleWarningConfirm}
				onCancel={handleWarningCancel}
				utilityName={displayName}
			/>

			<Stack style={{paddingTop: "4em", paddingBottom: "2em", position: "relative"}}>
				<Heading as="h3" size={3}>{Icon && <Icon style={{display: 'inline-block', marginRight: '0.35em', opacity: 0.5, transform: 'translateY(2px)'}} />}{displayName} {dangerMode && "(Replace Mode)"}</Heading>
				<Text muted size={1} style={{paddingTop: "2em", maxWidth: "calc(100% - 100px)"}}>
					Bulk add or modify field data across documents. Full replace mode: set complete values. Partial mode: find/replace text within strings (e.g., remove "84 " from "84 bold"). Prepend/Append: add text to beginning/end. Transform: trim, change case, convert field types (string → number, etc).
				</Text>
				<div style={{position: "absolute", bottom: "1.5em", right: "0"}}>
					<Button
						mode={exclude?"ghost":"bleed"}
						tone="positive"
						icon={exclude?CollapseIcon:ExpandIcon}
						onClick={() => { setExclude(!exclude) }}
						style={{cursor: "pointer", marginLeft: ".5em"}}
					/>
					<Button
						mode={dangerMode?"ghost":"bleed"}
						tone="critical"
						icon={dangerMode?UnlockIcon:LockIcon}
						onClick={handleDangerModeToggle}
						style={{cursor: "pointer", marginLeft: ".5em"}}
					/>
				</div>
			</Stack>
			<Stack style={{ position: "relative" }} >
				<Grid columns={exclude ? [3] : [2]} gap={0} style={{position: "relative"}}>
					<TextInput
						style={{
							borderRadius: "3px 0 0 0",
						}}
						onChange={(event) => { setSearchAddDataValue(event.currentTarget.value) }}
						placeholder="Name"
						value={searchAddDataValue}
					/>
					{!!exclude &&
						<TextInput
							style={{
								display: exclude ? "" : "none",
							}}
							onChange={(event) => { setExcludeValue(event.currentTarget.value) }}
							placeholder="Excluding"
							value={excludeValue}
						/>
					}
					<Select
						style={{
							borderRadius: "0 3px 0 0",
						}}
						onChange={(event) => { setSearchAddDataType(event.currentTarget.value) }}
						value={searchAddDataType}
					>
						<option value="typeface">Typeface</option>
						<option value="collection">Collection</option>
						<option value="pair">Pair</option>
						<option value="font">Font</option>
						<option value="license">License</option>
						<option value="order">Order</option>
						<option value="account">Account</option>
						<option value="cart">Cart</option>
						<option value="page">Page</option>
						<option value="blogpost">Blogpost</option>
						<option value="release-notes">Release Notes</option>
					</Select>
				</Grid>
			</Stack>
			<Stack
				style={{
					marginTop: "-1px",
				}}
			>
				<TextInput
					style={{
						borderRadius: "0",
					}}
					onChange={(event) => { setSearchAddDataField(event.currentTarget.value) }}
					placeholder="Field Name*"
					value={searchAddDataField}
				/>
			</Stack>

			{/* Replace Mode Selection - Only show advanced modes when danger mode is enabled */}
			{dangerMode && (
				<Stack style={{marginTop: "1em"}}>
					<Card padding={3} tone="transparent" border={1}>
						<Text size={1} weight="semibold" style={{marginBottom: "0.5em", display: "block"}}>Replace Mode:</Text>
						<Grid columns={[5]} gap={2}>
							<label style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5em"}}>
								<Radio checked={replaceMode === 'full'} onChange={() => setReplaceMode('full')} />
								<Text size={1}>Full Replace</Text>
							</label>
							<label style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5em"}}>
								<Radio checked={replaceMode === 'partial'} onChange={() => setReplaceMode('partial')} />
								<Text size={1}>Find & Replace</Text>
							</label>
							<label style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5em"}}>
								<Radio checked={replaceMode === 'prepend'} onChange={() => setReplaceMode('prepend')} />
								<Text size={1}>Prepend</Text>
							</label>
							<label style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5em"}}>
								<Radio checked={replaceMode === 'append'} onChange={() => setReplaceMode('append')} />
								<Text size={1}>Append</Text>
							</label>
							<label style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5em"}}>
								<Radio checked={replaceMode === 'transform'} onChange={() => setReplaceMode('transform')} />
								<Text size={1}>Transform</Text>
							</label>
						</Grid>
					</Card>
				</Stack>
			)}

			{/* Mode-specific inputs */}
			{replaceMode === 'full' && (
				<>
					<Stack
						style={{
							marginTop: "-1px",
						}}
					>
						<TextArea
							style={{
								borderRadius: "0 0 3px",
								borderTop: "0",
								minHeight: "200px"
							}}
							onChange={(event) => { setAddableData(event.currentTarget.value) }}
							placeholder={
								`[\n` +
								`   {key: "Designer", value: "", _key: Math.random().toString(36).substr(2, 9)},\n` +
								`   {key: "Engineer", value: "", _key: Math.random().toString(36).substr(2, 9)},\n` +
								`   {key: "Current Release", value: "", _key: Math.random().toString(36).substr(2, 9)},\n` +
								`   {key: "Initial Release", value: "", _key: Math.random().toString(36).substr(2, 9)}\n` +
								`]`
							}
							value={addableData}
						/>
					</Stack>
				</>
			)}

			{replaceMode === 'partial' && (
				<Stack style={{marginTop: "-1px"}}>
					<Grid columns={[2]} gap={0}>
						<TextInput
							style={{borderRadius: "0"}}
							onChange={(event) => { setFindText(event.currentTarget.value) }}
							placeholder="Find text (e.g., '84 ')"
							value={findText}
						/>
						<TextInput
							style={{borderRadius: "0"}}
							onChange={(event) => { setReplaceText(event.currentTarget.value) }}
							placeholder="Replace with (leave empty to remove)"
							value={replaceText}
						/>
					</Grid>
				</Stack>
			)}

			{(replaceMode === 'prepend' || replaceMode === 'append') && (
				<Stack style={{marginTop: "-1px"}}>
					<TextInput
						style={{borderRadius: "0"}}
						onChange={(event) => { setReplaceText(event.currentTarget.value) }}
						placeholder={`Text to ${replaceMode}`}
						value={replaceText}
					/>
				</Stack>
			)}

			{replaceMode === 'transform' && (
				<Stack style={{marginTop: "-1px"}}>
					<Select
						style={{borderRadius: "0"}}
						onChange={(event) => { setTransformType(event.currentTarget.value) }}
						value={transformType}
					>
						<optgroup label="Text Transforms">
							<option value="trim">Trim Whitespace</option>
							<option value="uppercase">UPPERCASE</option>
							<option value="lowercase">lowercase</option>
							<option value="capitalize">Capitalize First Letter</option>
						</optgroup>
						<optgroup label="Type Conversions">
							<option value="toNumber">Convert to Number</option>
							<option value="toBoolean">Convert to Boolean</option>
							<option value="toArray">Convert to Array</option>
							<option value="toString">Convert to String</option>
						</optgroup>
					</Select>
				</Stack>
			)}

			{/* Preview */}
			<Stack
				style={{
					marginTop: "-1px",
				}}
			>
				<TextArea
					style={{
						borderRadius: "0 0 3px",
						borderTop: "0",
						pointerEvents: "none",
					}}
					placeholder={`{"Field Name":[{"key":"Designer","value":""},{"key":"Engineer","value":""},{"key":"Current Release","value":""},{"key":"Initial Release","value":""}]}`}
					value={addableDataFormatted}
					readOnly
				/>
			</Stack>

			{(canEval && searchAddDataField.length && searchAddData.length) ? (
				<Stack>
					<Button
						style={{
							borderRadius: "3px",
							marginTop: ".5em",
							textAlign: "center",
						}}
						flex={1}
						tone="critical"
						onClick={() => { AddNotReplaceData() }}
						text={dangerMode?"REPLACE (Are you sure?)":"Add (Not Replace)"}
						icon={EditIcon}
					/>
				</Stack>
			): ''}

			{searchAddDataMessage!="" && (
				<Stack>
					<p style={{padding: ".5em 0em 1em", opacity: "0.75"}} dangerouslySetInnerHTML={{__html: searchAddDataMessage}}></p>
				</Stack>
			)}

			{searchAddData.length > 0 && (
				<>
					<div
						style={{
							maxHeight: "400px",
							marginTop: "5px",
							border: "1px solid rgba(255,255,255,0.1)",
							overflow: "auto",
							paddingBottom: "1rem",
							borderRadius: "3px",
						}}
					>
						{searchAddData.map((item, index) => (
							<a
								target="_blank"
								key={`item-${index}`}
								className="link"
								href={`${window.location.origin}/desk/${(searchAddDataType === "typeface" || searchAddDataType === "licenseGroup") ? "orderable-" : ""}${searchAddDataType};${item._id}`}
							>
								<Stack>
									<Text size={1} style={{padding: "1em 1em .5em"}}>{item.title}</Text>
								</Stack>
							</a>
						))}
					</div>
					<div style={{pointerEvents: "none", textAlign: "right", top: "-30px", paddingRight: "10px", position: "relative", height: "30px"}}>{searchAddData.length} items</div>
				</>
			)}
		</>
	)
}

export default SearchAddData
