"""Sidecar defaults the device stream does not carry.

Consumer EEG SDKs (Neurosity Crown, Upside Down Labs BioAmp) stream samples
plus a channel list and sampling rate, but *not* the electrode referencing,
ground, or power-line frequency that a BIDS `_eeg.json` sidecar requires. Those
must be supplied from the hardware's published specs / the recording setup —
they are configuration, not data read off the wire.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class EegSidecarConfig:
    """Fields injected into the BIDS `_eeg.json` sidecar."""

    manufacturer: str = "Neurosity"
    model: str = "Crown"
    # The Crown uses a driven-reference (CMS/DRL) analog front-end.
    eeg_reference: str = "CMS/DRL driven reference (Neurosity Crown)"
    eeg_ground: str = "DRL (driven right leg)"
    # Mains frequency at the recording site. 60 Hz in North America, 50 elsewhere.
    power_line_freq: float = 60.0
    # 10-20 label set used to place electrodes for montage/plotting.
    montage: str = "standard_1020"
    software_filters: str = "n/a"


# The Neurosity Crown's fixed 8-channel montage (10-20 labels).
CROWN_CHANNELS: list[str] = ["CP3", "C3", "F5", "PO3", "PO4", "F6", "C4", "CP4"]
CROWN_SFREQ: float = 256.0
