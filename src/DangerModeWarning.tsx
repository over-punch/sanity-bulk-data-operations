// Shared danger mode warning modal component

import {Stack, Card, Heading, Text, Button, Checkbox, Box} from '@sanity/ui'
import {WarningOutlineIcon} from '@sanity/icons'
import {useState} from 'react'

/** Props for the DangerModeWarning modal */
interface DangerModeWarningProps {
	/** Whether the modal is open */
	isOpen: boolean
	/** Callback when user confirms entering danger mode */
	onConfirm: () => void
	/** Callback when user cancels */
	onCancel: () => void
	/** Name of the utility entering danger mode */
	utilityName: string
}

/**
 * Warning modal displayed before entering danger mode.
 * Includes an option to suppress the warning for 48 hours.
 */
const DangerModeWarning = ({isOpen, onConfirm, onCancel, utilityName}: DangerModeWarningProps) => {
	const [suppressWarning, setSuppressWarning] = useState(false)

	const handleConfirm = () => {
		if (suppressWarning) {
			// Store suppression timestamp in localStorage
			const expiryTime = Date.now() + 48 * 60 * 60 * 1000
			localStorage.setItem('dangerModeWarningSuppress', expiryTime.toString())
		}
		onConfirm()
	}

	if (!isOpen) return null

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 999999,
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				pointerEvents: 'auto',
			}}
			onClick={onCancel}
		>
			<Card
				padding={4}
				radius={2}
				shadow={3}
				style={{
					maxWidth: '500px',
					width: '90%',
					backgroundColor: 'var(--card-bg-color)',
					position: 'relative',
					zIndex: 1000000,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<Stack space={4}>
					<Heading as="h3" size={2}>
						Danger Mode Warning
					</Heading>

					<Stack space={3}>
						<div
							style={{
								textAlign: 'center',
								fontSize: '3em',
								color: 'var(--card-badge-critical-dot-color)',
							}}
						>
							<WarningOutlineIcon />
						</div>
						<Text align="center" size={2} weight="bold">
							You are about to enable Danger Mode
						</Text>
						<Text align="center" size={1} muted>
							{utilityName} can permanently modify or delete data across multiple documents. This
							action cannot be undone.
						</Text>
					</Stack>

					<Stack space={2}>
						<Text size={1} weight="semibold">
							Please ensure:
						</Text>
						<Text size={1} muted>
							• You have a backup of your data
						</Text>
						<Text size={1} muted>
							• You understand what changes will be made
						</Text>
						<Text size={1} muted>
							• You have reviewed the affected documents
						</Text>
					</Stack>

					<Box paddingTop={3}>
						<Checkbox
							id="suppress-warning"
							checked={suppressWarning}
							onChange={(event) => setSuppressWarning(event.target.checked)}
						/>
						<Box
							flex={1}
							paddingLeft={3}
							style={{display: 'inline-block', transform: 'translate(0, -10px)'}}
						>
							<Text size={1}>
								<label htmlFor="suppress-warning">
									Don&apos;t show this warning for 48 hours
								</label>
							</Text>
						</Box>
					</Box>

					<Stack space={2}>
						<Button
							text="Enable Danger Mode"
							tone="critical"
							onClick={handleConfirm}
							style={{cursor: 'pointer'}}
						/>
						<Button
							text="Cancel"
							mode="ghost"
							onClick={onCancel}
							style={{cursor: 'pointer'}}
						/>
					</Stack>
				</Stack>
			</Card>
		</div>
	)
}

/**
 * Returns true if the danger mode warning should be shown.
 * Suppression expires after 48 hours.
 */
export const shouldShowDangerWarning = (): boolean => {
	const suppressUntil = localStorage.getItem('dangerModeWarningSuppress')
	if (!suppressUntil) return true

	const expiryTime = parseInt(suppressUntil, 10)
	if (Date.now() > expiryTime) {
		localStorage.removeItem('dangerModeWarningSuppress')
		return true
	}

	return false
}

export default DangerModeWarning
